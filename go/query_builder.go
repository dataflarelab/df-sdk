package dataflare

import (
	"fmt"
)

// QueryBuilder provides a fluent interface for building dataset queries.
type QueryBuilder struct {
	service *DatasetService
	dataset string
	search  string
	filters map[string]interface{}
	limit   int
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

// Limit sets the maximum number of results to return.
func (b *QueryBuilder) Limit(limit int) *QueryBuilder {
	b.limit = limit
	return b
}

// Params returns the query parameters as a map.
func (b *QueryBuilder) Params() map[string]interface{} {
	params := make(map[string]interface{})
	if b.search != "" {
		params["search"] = b.search
	}
	if b.limit > 0 {
		params["limit"] = b.limit
	}
	for k, v := range b.filters {
		params[k] = v
	}
	return params
}

// Execute executes the built query.
func (b *QueryBuilder) Execute() ([]interface{}, error) {
	fmt.Printf("Executing query on dataset '%s' with params: %+v\n", b.dataset, b.Params())
	// In a real implementation, this would call b.service.Query(...)
	return []interface{}{}, nil
}
