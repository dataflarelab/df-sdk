from typing import Optional, Dict, Any, List, TYPE_CHECKING
from ..models.dataset import DatasetQueryResponse, DatasetDocument

if TYPE_CHECKING:
    from .datasets import DatasetService
    from .async_datasets import AsyncDatasetService


class QueryBuilder:
    """
    A fluent interface for building and executing dataset queries.
    """

    def __init__(self, service, dataset: str):
        self._service = service
        self._dataset = dataset
        self._search_term = None
        self._filters = {}
        self._limit = 100
        self._cursor = None

    def search(self, term: str) -> "QueryBuilder":
        """Set the search term."""
        self._search_term = term
        return self

    def where(self, key: str, value: Any) -> "QueryBuilder":
        """Add a filter constraint."""
        self._filters[key] = value
        return self

    def limit(self, count: int) -> "QueryBuilder":
        """Set the page limit."""
        self._limit = count
        return self

    def after(self, cursor: str) -> "QueryBuilder":
        """Set the pagination cursor."""
        self._cursor = cursor
        return self

    def execute(self) -> DatasetQueryResponse:
        """
        Execute the query synchronously. 
        Note: This only works if the builder was initialized with a sync DatasetService.
        """
        if hasattr(self._service, "query"):
            # If the service has a sync query method (we might need to add it to DatasetService too)
            return self._service.query(
                self._dataset,
                search_term=self._search_term,
                filters=self._filters,
                limit=self._limit,
                cursor=self._cursor,
            )
        # Fallback to a hidden sync execute if we only have DatasetService
        return self._service._execute_query_sync(
            self._dataset,
            search_term=self._search_term,
            filters=self._filters,
            limit=self._limit,
            cursor=self._cursor,
        )

    async def execute_async(self) -> DatasetQueryResponse:
        """
        Execute the query asynchronously.
        """
        return await self._service.query(
            self._dataset,
            search_term=self._search_term,
            filters=self._filters,
            limit=self._limit,
            cursor=self._cursor,
        )
