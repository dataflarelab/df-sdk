import pytest
import respx
import httpx
from unittest.mock import patch, mock_open

from df.client import DFClient
from df.exceptions import AuthenticationError


@pytest.fixture
def client():
    import os

    # Environment variable automatically fetched
    with patch.dict(
        os.environ, {"DF_API_KEY": "dfk_1234567890abcdef1234567890abcdef12345678"}
    ):
        with DFClient(base_url="https://api.test.com", max_retries=1) as c:
            yield c


@respx.mock
def test_dataset_stream_pagination(client: DFClient):
    # Mock first page
    respx.post("https://api.test.com/v1/datasets").mock(
        return_value=httpx.Response(
            200,
            json={
                "data": [{"_id": "doc1", "text": "Hello"}],
                "count": 1,
                "next_cursor": "cur1",
            },
        )
    )

    # We must patch the second request matching cursor
    def handle_request(request):
        import json

        body = json.loads(request.content)
        if body.get("cursor") == "cur1":
            return httpx.Response(
                200,
                json={
                    "data": [{"_id": "doc2", "text": "World"}],
                    "count": 1,
                    "next_cursor": None,
                },
            )
        return httpx.Response(
            200,
            json={
                "data": [{"_id": "doc1", "text": "Hello"}],
                "count": 1,
                "next_cursor": "cur1",
            },
        )

    respx.post("https://api.test.com/v1/datasets").mock(side_effect=handle_request)

    # Act
    items = list(client.datasets.stream("legal"))

    # Assert
    assert len(items) == 2
    assert items[0].id == "doc1"
    assert items[1].id == "doc2"


@respx.mock
def test_authentication_error(client: DFClient):
    respx.post("https://api.test.com/v1/datasets").mock(
        return_value=httpx.Response(401, json={"error": "unauthorized"})
    )

    with pytest.raises(AuthenticationError):
        list(client.datasets.stream("legal"))


@respx.mock
def test_download_file(client: DFClient):
    # Tests that download_file writes bytes successfully
    url = "https://cdn.dataflare.com/doc.pdf"
    respx.get(url).mock(return_value=httpx.Response(200, content=b"fake-pdf-content"))

    with patch("builtins.open", mock_open()) as mocked_file:
        with patch("os.makedirs"):
            client.datasets.download_file(url, "fake.pdf")

            # Ensures file was opened and written
            mocked_file.assert_called_with("fake.pdf", "wb")
            mocked_file().write.assert_called()
