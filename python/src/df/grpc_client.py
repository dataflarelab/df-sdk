import os
from typing import Optional
from .models.dataset import DatasetDocument

try:
    import grpc
    from grpc_requests import Client as GrpcReflectionClient
except ImportError:
    raise ImportError(
        "Please install the SDK with gRPC support: pip install dataflare-sdk[grpc]"
    )


class APIKeyInterceptor(
    grpc.UnaryUnaryClientInterceptor,
    grpc.UnaryStreamClientInterceptor,
    grpc.StreamUnaryClientInterceptor,
    grpc.StreamStreamClientInterceptor,
):
    def __init__(self, api_key: str):
        self.api_key = api_key

    def _intercept(self, continuation, client_call_details, request_or_iterator):
        metadata = list(client_call_details.metadata or [])
        metadata.append(("x-api-key", self.api_key))
        new_details = client_call_details._replace(metadata=metadata)
        return continuation(new_details, request_or_iterator)

    def intercept_unary_unary(self, continuation, client_call_details, request):
        return self._intercept(continuation, client_call_details, request)

    def intercept_unary_stream(self, continuation, client_call_details, request):
        return self._intercept(continuation, client_call_details, request)

    def intercept_stream_unary(
        self, continuation, client_call_details, request_iterator
    ):
        return self._intercept(continuation, client_call_details, request_iterator)

    def intercept_stream_stream(
        self, continuation, client_call_details, request_iterator
    ):
        return self._intercept(continuation, client_call_details, request_iterator)


class DFGRPCClient:
    """
    Dynamic DataFlare gRPC Client using Server Reflection.
    Does not require compiled `.proto` stubs.
    """

    def __init__(
        self, api_key: Optional[str] = None, target: str = "rpc.dataflare.com:443"
    ):
        self.api_key = api_key or os.environ.get("DF_API_KEY")
        if not self.api_key:
            raise ValueError(
                "DF API key must be provided or set as DF_API_KEY environment variable."
            )
        self.target = target

        # We pass {"root_certificates": None} to bypass a bug in grpc-requests v0.1.21
        # where `if credentials:` evaluates to False for `{}` and passes None to **kwargs.
        self._interceptor = APIKeyInterceptor(self.api_key)
        self._client = GrpcReflectionClient(
            endpoint=self.target,
            ssl=True,
            credentials={"root_certificates": None},
            interceptors=[self._interceptor],
        )

        self.datasets = DatasetGRPCService(self._client, self.api_key)

    def close(self):
        try:
            self._client.__exit__(None, None, None)
        except Exception:
            pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


class DatasetGRPCService:
    def __init__(self, reflection_client: GrpcReflectionClient, api_key: str):
        self._client = reflection_client
        self.api_key = api_key
        self._metadata = [("x-api-key", api_key)]

    def query(
        self,
        dataset: str,
        limit: int = 10,
        cursor: str = "",
        search_term: str = "",
        filters: Optional[dict] = None,
    ):
        req = {
            "dataset": dataset,
            "limit": limit,
            "cursor": cursor,
            "search_term": search_term,
        }
        if filters:
            req["filters"] = {k: str(v) for k, v in filters.items()}

        resp_dict = self._client.request(
            "dfapi.v1.DatasetService", "Query", req, metadata=self._metadata
        )

        results = []
        for record in resp_dict.get("data", []):
            fields = record.get("fields", {})
            results.append(DatasetDocument(**fields))

        return results, resp_dict.get("next_cursor")
