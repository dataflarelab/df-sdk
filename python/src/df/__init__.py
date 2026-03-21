from .client import DFClient
from .exceptions import APIError, AuthenticationError, RateLimitError

try:
    from importlib.metadata import version
    __version__ = version("dataflare-sdk")
except Exception:
    __version__ = "unknown"

__all__ = ["DFClient", "APIError", "AuthenticationError", "RateLimitError", "__version__"]
