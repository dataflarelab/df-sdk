"""
DF SDK
Official Python SDK for the DataFlare API.
"""

from .client import DFClient
from .exceptions import APIError, AuthenticationError, RateLimitError

__version__ = "0.1.0"
__all__ = [
    "DFClient",
    "APIError",
    "AuthenticationError",
    "RateLimitError",
    "__version__",
]
