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

// request performs an HTTP request with exponential backoff retries.
func (c *DFClient) request(ctx context.Context, method, path string, body interface{}) ([]byte, error) {
	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewBuffer(jsonBody)
	}

	url := fmt.Sprintf("%s%s", c.BaseURL, path)
	maxRetries := 3

	for attempt := 0; attempt <= maxRetries; attempt++ {
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
func (s *DatasetService) Query(ctx context.Context, dataset string, params map[string]interface{}) (*models.DatasetResponse, error) {
	if params == nil {
		params = make(map[string]interface{})
	}
	params["dataset"] = dataset

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
func (s *DatasetService) Stream(ctx context.Context, dataset string, params map[string]interface{}) (<-chan models.Document, <-chan error) {
	docChan := make(chan models.Document)
	errChan := make(chan error, 1)

	if params == nil {
		params = make(map[string]interface{})
	}

	go func() {
		defer close(docChan)
		defer close(errChan)

		cursor := ""
		for {
			if cursor != "" {
				params["cursor"] = cursor
			}

			resp, err := s.Query(ctx, dataset, params)
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
			cursor = resp.NextCursor
		}
	}()

	return docChan, errChan
}
