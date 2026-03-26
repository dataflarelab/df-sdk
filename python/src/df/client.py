import os
import httpx
import re
from typing import Optional
import importlib.metadata

from .services.datasets import DatasetService
from .services.async_datasets import AsyncDatasetService


def _validate_api_key(api_key: Optional[str]) -> str:
    if not api_key:
        api_key = os.environ.get("DF_API_KEY")
    if not api_key:
        raise ValueError(
            "DF API key must be provided or set as DF_API_KEY environment variable."
        )
    if not re.match(r"^dfk_[a-zA-Z0-9]{40,64}$", api_key):
        from .exceptions import AuthenticationError

        raise AuthenticationError(
            "Invalid API Key format. Expected 'dfk_' followed by 40-64 alphanumeric characters."
        )
    return api_key


def _mask_api_key(api_key: str) -> str:
    return f"{api_key[:4]}****{api_key[-4:]}"


try:
    __version__ = importlib.metadata.version("dataflare-sdk")
except importlib.metadata.PackageNotFoundError:
    __version__ = "unknown"


class DFClient:
    """
    The official DF (DataFlare) API Client.
    Manages connection pooling, authentication, and HTTP retries globally.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.dataflare.com",
        timeout: float = 30.0,
        max_retries: int = 3,
    ):
        """
        Initializes the DF API Client.
        :param api_key: Your API Key. Defaults to the DF_API_KEY env var.
        :param base_url: The base URL for the DF API.
        :param timeout: HTTP request timeout in seconds.
        :param max_retries: The maximum number of background retries for transient errors.
        """
        self.api_key = _validate_api_key(api_key)

        self.base_url = base_url.rstrip("/")
        self.max_retries = max_retries

        # Configure connection pooled httpx client
        self._http_client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers={
                "X-API-Key": self.api_key,
                "Accept": "application/json",
                "User-Agent": f"df-python/{__version__}",
            },
        )

        # Initialize services
        self.datasets = DatasetService(self._http_client, max_retries=self.max_retries)

    def close(self):
        """Close the underlying HTTP connection pool."""
        self._http_client.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def __repr__(self):
        masked = _mask_api_key(self.api_key)
        return f"DFClient(key={masked}, base_url={self.base_url})"


class AsyncDFClient:
    """
    Asynchronous version of the DF API Client.
    Recommended for high-throughput applications and web backends.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.dataflare.com",
        timeout: float = 30.0,
        max_retries: int = 3,
    ):
        self.api_key = _validate_api_key(api_key)
        self.base_url = base_url.rstrip("/")
        self.max_retries = max_retries

        self._http_client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=timeout,
            headers={
                "X-API-Key": self.api_key,
                "Accept": "application/json",
                "User-Agent": f"df-python/{__version__}",
            },
        )

        self.datasets = AsyncDatasetService(
            self._http_client, max_retries=self.max_retries
        )

    async def close(self):
        await self._http_client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    def __repr__(self):
        masked = _mask_api_key(self.api_key)
        return f"AsyncDFClient(key={masked}, base_url={self.base_url})"
