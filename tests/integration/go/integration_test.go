//go:build integration
package integration

import (
	"context"
	"os"
	"testing"

	"github.com/dataflarelab/df-sdk/go"
)

func TestIntegration_Query(t *testing.T) {
	apiKey := os.Getenv("DF_API_KEY")
	baseURL := os.Getenv("DF_BASE_URL")

	client := df.NewClient(&df.ClientOptions{
		APIKey:  apiKey,
		BaseURL: baseURL,
	})

	ctx := context.Background()
	resp, err := client.Datasets.Query(ctx, "test-dataset", nil)
	if err != nil {
		t.Fatalf("Failed to query dataset: %v", err)
	}

	if resp == nil {
		t.Fatal("Response is nil")
	}
}
