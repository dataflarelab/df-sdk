package dataflare

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/dataflarelab/df-sdk/go/models"
)

func TestDFClient_Query(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-api-key") != "test-key" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		resp := models.DatasetResponse{
			Dataset: "test",
			Data:    []models.Document{{ID: "doc1", Content: "hello"}},
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := NewClient(&ClientOptions{APIKey: "test-key", BaseURL: server.URL})
	resp, err := client.Datasets.Query(context.Background(), "test", nil)
	if err != nil {
		t.Fatalf("Query failed: %v", err)
	}

	if len(resp.Data) != 1 || resp.Data[0].ID != "doc1" {
		t.Errorf("Unexpected response: %+v", resp)
	}
}

func TestDFClient_Stream(t *testing.T) {
	callCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		var resp models.DatasetResponse
		if callCount == 1 {
			resp = models.DatasetResponse{
				Dataset:    "test",
				Data:       []models.Document{{ID: "doc1"}},
				NextCursor: "cursor2",
			}
		} else {
			resp = models.DatasetResponse{
				Dataset: "test",
				Data:    []models.Document{{ID: "doc2"}},
			}
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := NewClient(&ClientOptions{APIKey: "test-key", BaseURL: server.URL})
	docChan, errChan := client.Datasets.Stream(context.Background(), "test", nil)

	count := 0
	for doc := range docChan {
		count++
		if count == 1 && doc.ID != "doc1" {
			t.Errorf("Expected doc1, got %s", doc.ID)
		}
	}

	if err := <-errChan; err != nil {
		t.Fatalf("Stream failed: %v", err)
	}

	if count != 2 {
		t.Errorf("Expected 2 docs, got %d", count)
	}
}
