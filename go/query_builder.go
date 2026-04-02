package dataflare

import (
	"context"

	"github.com/dataflarelab/df-sdk/go/models"
)

// QueryBuilder provides a fluent interface for building dataset queries.
type QueryBuilder struct {
	service *DatasetService
	dataset string
	search  string
	filters map[string]interface{}
	fields  []string
	limit   int
	offset  int
}

// NewQueryBuilder creates a new QueryBuilder instance.
func NewQueryBuilder(service *DatasetService, dataset string) *QueryBuilder {
	return &QueryBuilder{
		service: service,
		dataset: dataset,
		filters: make(map[string]interface{}),
	}
}

// Search sets the search term for the query.
func (b *QueryBuilder) Search(term string) *QueryBuilder {
	b.search = term
	return b
}

// Where adds a filter to the query.
func (b *QueryBuilder) Where(key string, value interface{}) *QueryBuilder {
	b.filters[key] = value
	return b
}

// Fields sets the fields to include in the query results.
func (b *QueryBuilder) Fields(fields []string) *QueryBuilder {
	b.fields = fields
	return b
}

// Limit sets the maximum number of results to return.
func (b *QueryBuilder) Limit(limit int) *QueryBuilder {
	b.limit = limit
	return b
}

// Offset sets the number of results to skip.
func (b *QueryBuilder) Offset(offset int) *QueryBuilder {
	b.offset = offset
	return b
}

// Params returns the query parameters as QueryOptions.
func (b *QueryBuilder) Params() *models.QueryOptions {
	return &models.QueryOptions{
		SearchTerm: b.search,
		Filters:    b.filters,
		Fields:     b.fields,
		Limit:      b.limit,
		Offset:     b.offset,
	}
}

// Execute executes the built query.
func (b *QueryBuilder) Execute(ctx context.Context) (*models.DatasetResponse, error) {
	return b.service.Query(ctx, b.dataset, b.Params())
}

// Stream performs a streaming paginated query on a dataset.
func (b *QueryBuilder) Stream(ctx context.Context) (<-chan models.Document, <-chan error) {
	return b.service.Stream(ctx, b.dataset, b.Params())
}
