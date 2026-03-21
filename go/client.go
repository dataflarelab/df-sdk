package dataflare

import (
	"bytes"
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
	apiKey := opts.APIKey
	if apiKey == "" {
		apiKey = os.Getenv("DF_API_KEY")
	}

	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = "https://api.dataflare.com"
	}

	c := &DFClient{
		APIKey:     apiKey,
		BaseURL:    baseURL,
		HTTPClient: &http.Client{Timeout: 30 * time.Second},
	}
	c.Datasets = &DatasetService{client: c}
	return c
}

// request performs an HTTP request with exponential backoff retries.
func (c *DFClient) request(method, path string, body interface{}) ([]byte, error) {
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
		req, err := http.NewRequest(method, url, bodyReader)
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
			c.backoff(attempt)
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusTooManyRequests {
			if attempt == maxRetries {
				return nil, fmt.Errorf("rate limit exceeded after %d retries", maxRetries)
			}
			c.backoff(attempt)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("API error: %s", resp.Status)
		}

		return io.ReadAll(resp.Body)
	}

	return nil, fmt.Errorf("request failed after %d retries", maxRetries)
}

func (c *DFClient) backoff(attempt int) {
	delay := time.Duration(math.Pow(2, float64(attempt))) * time.Second
	time.Sleep(delay)
}

// DatasetService handles dataset-related operations.
type DatasetService struct {
	client *DFClient
}

// Query performs a paginated query on a dataset.
func (s *DatasetService) Query(dataset string, params map[string]interface{}) (*models.DatasetResponse, error) {
	if params == nil {
		params = make(map[string]interface{})
	}
	params["dataset"] = dataset

	respData, err := s.client.request("POST", "/v1/datasets", params)
	if err != nil {
		return nil, err
	}

	var datasetResp models.DatasetResponse
	if err := json.Unmarshal(respData, &datasetResp); err != nil {
		return nil, err
	}

	return &datasetResp, nil
}

// Stream performs a streaming paginated query on a dataset.
func (s *DatasetService) Stream(dataset string, params map[string]interface{}) (<-chan models.Document, <-chan error) {
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

			resp, err := s.Query(dataset, params)
			if err != nil {
				errChan <- err
				return
			}

			for _, doc := range resp.Data {
				docChan <- doc
			}

			if resp.NextCursor == "" {
				break
			}
			cursor = resp.NextCursor
		}
	}()

	return docChan, errChan
}
