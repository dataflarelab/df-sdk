package dataflare

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"regexp"
	"time"

	"github.com/dataflarelab/df-sdk/go/models"
)

// DFClient is the main REST client for the Dataflare API.
type DFClient struct {
	APIKey     string
	BaseURL    string
	HTTPClient *http.Client
	Datasets   *DatasetService
}

// ClientOptions allows configuring the DFClient.
type ClientOptions struct {
	APIKey  string
	BaseURL string
}

// NewClient creates a new DFClient with the provided options.
func NewClient(opts *ClientOptions) *DFClient {
	apiKey := ""
	baseURL := "https://api.dataflare.com"

	if opts != nil {
		apiKey = opts.APIKey
		if opts.BaseURL != "" {
			baseURL = opts.BaseURL
		}
	}

	if apiKey == "" {
		apiKey = os.Getenv("DF_API_KEY")
	}

	// Validate API key format
	if apiKey != "" {
		if err := validateAPIKey(apiKey); err != nil {
			fmt.Fprintf(os.Stderr, "Warning: %v\n", err)
		}
	}

	c := &DFClient{
		APIKey:  apiKey,
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 20,
				IdleConnTimeout:     90 * time.Second,
			},
		},
	}
	c.Datasets = &DatasetService{client: c}
	return c
}

func validateAPIKey(key string) error {
	matched, _ := regexp.MatchString(`^dfk_[a-zA-Z0-9]{40,64}$`, key)
	if !matched {
		return fmt.Errorf("invalid API key format: expected dfk_ prefix followed by 40-64 alphanumeric characters")
	}
	return nil
}

// request performs an HTTP request with exponential backoff retries.
func (c *DFClient) request(ctx context.Context, method, path string, body interface{}) ([]byte, error) {
	var jsonBody []byte
	if body != nil {
		var err error
		jsonBody, err = json.Marshal(body)
		if err != nil {
			return nil, err
		}
	}

	url := fmt.Sprintf("%s%s", c.BaseURL, path)
	maxRetries := 3

	for attempt := 0; attempt <= maxRetries; attempt++ {
		var bodyReader io.Reader
		if jsonBody != nil {
			bodyReader = bytes.NewReader(jsonBody)
		}

		req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
		if err != nil {
			return nil, err
		}

		req.Header.Set("x-api-key", c.APIKey)
		req.Header.Set("Content-Type", "application/json")

		resp, err := c.HTTPClient.Do(req)
		if err != nil {
			if attempt == maxRetries {
				return nil, err
			}
			if err := c.backoff(ctx, attempt); err != nil {
				return nil, err
			}
			continue
		}

		if resp.StatusCode == http.StatusTooManyRequests {
			resp.Body.Close()
			if attempt == maxRetries {
				return nil, fmt.Errorf("rate limit exceeded after %d retries", maxRetries)
			}
			if err := c.backoff(ctx, attempt); err != nil {
				return nil, err
			}
			continue
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			return nil, fmt.Errorf("API error: %s", resp.Status)
		}

		data, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		return data, err
	}

	return nil, fmt.Errorf("request failed after %d retries", maxRetries)
}

func (c *DFClient) backoff(ctx context.Context, attempt int) error {
	delay := time.Duration(math.Pow(2, float64(attempt))) * time.Second
	select {
	case <-time.After(delay):
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// DatasetService handles dataset-related operations.
type DatasetService struct {
	client *DFClient
}

// Builder creates a new QueryBuilder for a specific dataset.
func (s *DatasetService) Builder(dataset string) *QueryBuilder {
	return NewQueryBuilder(s, dataset)
}

// Query performs a paginated query on a dataset.
func (s *DatasetService) Query(ctx context.Context, dataset string, opts *models.QueryOptions) (*models.DatasetResponse, error) {
	params := make(map[string]interface{})
	params["dataset"] = dataset

	if opts != nil {
		if opts.SearchTerm != "" {
			params["search_term"] = opts.SearchTerm
		}
		if opts.Limit > 0 {
			params["limit"] = opts.Limit
		}
		if opts.Offset > 0 {
			params["offset"] = opts.Offset
		}
		if opts.Cursor != "" {
			params["cursor"] = opts.Cursor
		}
		if len(opts.Fields) > 0 {
			params["fields"] = opts.Fields
		}
		for k, v := range opts.Filters {
			params[k] = v
		}
	}

	respData, err := s.client.request(ctx, "POST", "/v1/datasets", params)
	if err != nil {
		return nil, err
	}

	var datasetResp models.DatasetResponse
	if err := json.Unmarshal(respData, &datasetResp); err != nil {
		return nil, err
	}

	return &datasetResp, nil
}

// Stream performs a streaming paginated query on a dataset, returning a document channel and an error channel.
func (s *DatasetService) Stream(ctx context.Context, dataset string, opts *models.QueryOptions) (<-chan models.Document, <-chan error) {
	docChan := make(chan models.Document)
	errChan := make(chan error, 1)

	if opts == nil {
		opts = &models.QueryOptions{}
	}

	go func() {
		defer close(docChan)
		defer close(errChan)

		// Create a copy of options to avoid mutating the original
		streamOpts := *opts

		for {
			resp, err := s.Query(ctx, dataset, &streamOpts)
			if err != nil {
				errChan <- err
				return
			}

			for _, doc := range resp.Data {
				select {
				case docChan <- doc:
				case <-ctx.Done():
					errChan <- ctx.Err()
					return
				}
			}

			if resp.NextCursor == "" {
				break
			}
			streamOpts.Cursor = resp.NextCursor
		}
	}()

	return docChan, errChan
}
