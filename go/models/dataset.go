package models

// Metadata represents the document metadata.
type Metadata struct {
	Title   string `json:"title"`
	Summary string `json:"summary"`
}

// Document represents a single document in a dataset.
type Document struct {
	ID        string   `json:"id"`
	Content   string   `json:"content"`
	Metadata  Metadata `json:"metadata"`
	SourceURL string   `json:"source_url,omitempty"`
	Category  string   `json:"category,omitempty"`
}

// DatasetResponse represents the paginated response from the datasets API.
type DatasetResponse struct {
	Dataset    string     `json:"dataset"`
	Data       []Document `json:"data"`
	Count      int        `json:"count"`
	NextCursor string     `json:"next_cursor"`
	Latency    string     `json:"latency"`
	Fields     []string   `json:"fields"`
}
