import os
import httpx
from typing import Optional
import importlib.metadata

from .services.datasets import DatasetService

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
        self.api_key = api_key or os.environ.get("DF_API_KEY")
        if not self.api_key:
            raise ValueError(
                "DF API key must be provided or set as DF_API_KEY environment variable."
            )

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
