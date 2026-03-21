class DFError(Exception):
    """Base exception for all DF SDK errors."""


class AuthenticationError(DFError):
    """Raised when the API returns a 401 Unauthorized."""


class RateLimitError(DFError):
    """Raised when the API returns a 429 Too Many Requests, and retries are exhausted."""


class APIError(DFError):
    """Raised when the API returns a 4xx or 5xx status code."""

    def __init__(self, message: str, status_code: int = None, details: dict = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details
