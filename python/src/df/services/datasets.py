import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)
from typing import Iterator, Optional, Dict, Any
import logging

from ..models.dataset import DatasetDocument, DatasetQueryResponse
from ..exceptions import RateLimitError, APIError, AuthenticationError

logger = logging.getLogger(__name__)


class DatasetService:
    def __init__(self, http_client: httpx.Client, max_retries: int = 3):
        self._client = http_client
        self.max_retries = max_retries

    def _should_retry_error(exc: Exception) -> bool:
        if isinstance(exc, RateLimitError):
            return True
        if isinstance(exc, APIError) and exc.status_code and exc.status_code >= 500:
            return True
        if isinstance(exc, httpx.RequestError):
            return True
        return False

    def _execute_request_with_retries(
        self, method: str, path: str, **kwargs
    ) -> httpx.Response:
        @retry(
            stop=stop_after_attempt(self.max_retries),
            wait=wait_exponential(multiplier=1, min=1, max=10),
            retry=retry_if_exception_type(
                (RateLimitError, httpx.RequestError, httpx.TimeoutException)
            ),
        )
        def _do_request():
            try:
                response = self._client.request(method, path, **kwargs)
                if response.status_code == 401:
                    raise AuthenticationError("Invalid API Key.")
                elif response.status_code == 403:
                    raise APIError(
                        "Access denied. You do not have permission for this dataset.",
                        status_code=403,
                    )
                elif response.status_code == 429:
                    raise RateLimitError("Rate limit exceeded.")
                elif not response.is_success:
                    raise APIError(
                        f"API Error: {response.text}", status_code=response.status_code
                    )
                return response
            except APIError as e:
                # We specifically raise APIError 5xx to trigger retry (handled by tenacity if we wanted to),
                # but currently retry_if specifies RateLimitError and network errors. Let's adjust logic.
                if e.status_code and e.status_code >= 500:
                    raise RateLimitError(
                        "Transient Server Error"
                    )  # mapped to generic retryable
                raise

        return _do_request()

    def stream(
        self,
        dataset: str,
        search_term: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 100,
    ) -> Iterator[DatasetDocument]:
        """
        Stream documents from a dataset. Handles pagination automatically.

        :param dataset: The dataset name (e.g. 'legal')
        :param search_term: Optional Arabic search text
        :param filters: Optional strict matching keys
        :param limit: Page chunk limit
        """
        cursor = None

        while True:
            payload = {"dataset": dataset, "limit": limit}
            if search_term:
                payload["search_term"] = search_term
            if filters:
                payload["filters"] = filters
            if cursor:
                payload["cursor"] = cursor

            response = self._execute_request_with_retries(
                "POST", "/v1/datasets", json=payload
            )
            data = response.json()

            # Use Pydantic to validate and instantiate models
            parsed_response = DatasetQueryResponse(**data)

            for doc in parsed_response.data:
                yield doc

            if not parsed_response.next_cursor:
                break

            cursor = parsed_response.next_cursor

    def download_file(self, url: str, destination: str, chunk_size: int = 8192):
        """
        Memory-safe helper to download a source PDF/file directly to disk.
        Does not buffer the file in RAM.

        :param url: The Presigned URL or CDN URL to download
        :param destination: The local file path to write to (e.g., './doc.pdf')
        :param chunk_size: Buffer chunk size in bytes
        """
        import os

        # We use an isolated client here to not leak auth headers if URL points to S3 directly
        with httpx.stream("GET", url, follow_redirects=True) as response:
            response.raise_for_status()

            # Ensure the directory exists
            os.makedirs(os.path.dirname(os.path.abspath(destination)), exist_ok=True)

            with open(destination, "wb") as f:
                for chunk in response.iter_bytes(chunk_size=chunk_size):
                    f.write(chunk)
