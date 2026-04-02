import httpx
from tenacity import (
    AsyncRetrying,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)
from typing import AsyncIterator, Optional, Dict, Any, List
import logging
import os

from ..models.dataset import DatasetDocument, DatasetQueryResponse
from ..exceptions import RateLimitError, APIError, AuthenticationError
from .query_builder import QueryBuilder

logger = logging.getLogger(__name__)


class AsyncDatasetService:
    def __init__(self, http_client: httpx.AsyncClient, max_retries: int = 3):
        self._client = http_client
        self.max_retries = max_retries

    async def _execute_request_with_retries(
        self, method: str, path: str, **kwargs
    ) -> httpx.Response:
        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(self.max_retries),
            wait=wait_exponential(multiplier=1, min=1, max=10),
            retry=retry_if_exception_type(
                (RateLimitError, httpx.RequestError, httpx.TimeoutException)
            ),
        ):
            with attempt:
                try:
                    response = await self._client.request(method, path, **kwargs)
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
                            f"API Error: {response.text}",
                            status_code=response.status_code,
                        )
                    return response
                except APIError as e:
                    if e.status_code and e.status_code >= 500:
                        raise RateLimitError("Transient Server Error")
                    raise

    async def query(
        self,
        dataset: str,
        search_term: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        fields: Optional[List[str]] = None,
        limit: int = 100,
        offset: int = 0,
        cursor: Optional[str] = None,
    ) -> DatasetQueryResponse:
        """
        Query documents from a dataset (single page).
        """
        payload = {"dataset": dataset, "limit": limit}
        if search_term:
            payload["search_term"] = search_term
        if filters:
            payload["filters"] = filters
        if fields:
            payload["fields"] = fields
        if offset > 0:
            payload["offset"] = offset
        if cursor:
            payload["cursor"] = cursor

        response = await self._execute_request_with_retries(
            "POST", "/v1/datasets", json=payload
        )
        return DatasetQueryResponse(**response.json())

    def builder(self, dataset: str) -> QueryBuilder:
        """
        Create a fluent QueryBuilder for this dataset.
        """
        return QueryBuilder(self, dataset)

    async def stream(
        self,
        dataset: str,
        search_term: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        fields: Optional[List[str]] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> AsyncIterator[DatasetDocument]:
        """
        Stream documents from a dataset. Handles pagination automatically.
        """
        cursor = None

        while True:
            response = await self.query(
                dataset,
                search_term=search_term,
                filters=filters,
                fields=fields,
                limit=limit,
                offset=offset,
                cursor=cursor,
            )

            for doc in response.data:
                yield doc

            if not response.next_cursor:
                break

            cursor = response.next_cursor

    async def download_file(self, url: str, destination: str, chunk_size: int = 8192):
        """
        Memory-safe helper to download a file directly to disk asynchronously.
        """
        import aiofiles

        # Ensure the directory exists
        os.makedirs(os.path.dirname(os.path.abspath(destination)), exist_ok=True)

        async with httpx.AsyncClient(follow_redirects=True) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                async with aiofiles.open(destination, "wb") as f:
                    async for chunk in response.aiter_bytes(chunk_size=chunk_size):
                        await f.write(chunk)
