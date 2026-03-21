package dataflare


// DFError is the base error for all Dataflare SDK errors.
type DFError struct {
	Message string
}

func (e *DFError) Error() string {
	return e.Message
}

// AuthenticationError is raised when the API key is invalid or expired.
type AuthenticationError struct {
	DFError
}

func NewAuthenticationError(msg string) *AuthenticationError {
	return &AuthenticationError{DFError{Message: msg}}
}

// RateLimitError is raised when the request limit is exceeded.
type RateLimitError struct {
	DFError
}

func NewRateLimitError(msg string) *RateLimitError {
	return &RateLimitError{DFError{Message: msg}}
}

// APIError is raised for general API failures (5xx).
type APIError struct {
	DFError
	StatusCode int
}

func NewAPIError(msg string, code int) *APIError {
	return &APIError{DFError{Message: msg}, code}
}
