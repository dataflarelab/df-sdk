from .client import DFClient
from .exceptions import APIError, AuthenticationError, RateLimitError

try:
    from importlib.metadata import version

    __version__ = version("dataflare-sdk")
except Exception:
    __version__ = "unknown"

try:
    from .grpc_client import DFGRPCClient
except ImportError:

    class DFGRPCClient:  # type: ignore
        def __init__(self, *args, **kwargs):
            raise ImportError(
                "Please install the SDK with gRPC support: pip install 'dataflare-sdk[grpc]'"
            )


__all__ = [
    "DFClient",
    "DFGRPCClient",
    "APIError",
    "AuthenticationError",
    "RateLimitError",
    "__version__",
]
