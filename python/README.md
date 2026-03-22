# DF API Python SDK [![PyPI](https://img.shields.io/pypi/v/dataflare-sdk?color=blue)](https://pypi.org/project/dataflare-sdk/)

The official Python SDK for the **DataFlare API**.

## Features
- **Typed Models:** Full Pydantic schemas mapping the Datasets API for rigid IDE autocompletion.
- **Connection Pools:** Subclass optimized `httpx` logic reusing TCP connections seamlessly.
- **Resilient Requests:** Automated retries (`tenacity`) wrapping Rate Limit and transient network faults over exponential backoffs.
- **Idiomatic Paginators:** `client.datasets.stream(...)` automatically handles cursor injection iteratively returning stream chunks cleanly.
- **Memory-safe Source Retrieval:** For pipelines feeding Large Language Models directly from data archives, effortlessly invoke `download_file(...)` natively chunking raw bytes down to the file system avoiding memory leaks.

## Installation

```bash
# Standard REST client
pip install dataflare-sdk

# Include gRPC support
pip install "dataflare-sdk[grpc]"
```

## Authentication

You will need a DataFlare API Key. The SDK provides two ways to configure it securely:

### 1. Auto-discover from Environment (Recommended)
Set the `DF_API_KEY` system environment variable (or load it from a local `.env` using `python-dotenv`):
```bash
export DF_API_KEY="dfk_abc123"
```

### 2. Direct Explicit Injection
If you pull secrets from an external vault, pass it directly into the constructor:
```python
from df import DFClient
client = DFClient(api_key="dfk_your_secret_key...")
```

## Quick Start

```python
from df import DFClient, AuthenticationError

# Automatically discovers DF_API_KEY from the environment
try:
    with DFClient() as client:
        
        # Generator handles pagination constraints completely
        for doc in client.datasets.stream("legal", search_term="التأمين", limit=100):
            print(f"Doc category: {doc.category} | Title: {doc.title} | Summary: {doc.summary} | Decision: {doc.decision}")
            
            # Helper to download the raw File to disk natively
            if doc.source_url:
                client.datasets.download_file(
                    doc.source_url, 
                    destination=f"./archives/{doc.id}.pdf"
                )

except AuthenticationError:
    print("Invalid API Key.")
```

## High-Performance gRPC Client

For environments requiring persistent connections and reduced latency, the SDK provides a dynamic gRPC client that works right out of the box using Server Reflection.

```python
from df import DFGRPCClient, AuthenticationError

# Requires installing extra dependencies: pip install dataflare-sdk[grpc]
try:
    with DFGRPCClient() as client:
        # Perform unary RPC instead of REST natively
        results, next_cursor = client.datasets.query(
            dataset="legal", 
            limit=10,
        )
        
        for doc in results:
            print(f"Title: {getattr(doc, 'title', None)} | Summary: {getattr(doc, 'summary', None)}")

except AuthenticationError:
    print("Invalid API Key.")
```

## 🛡️ License

MIT — see the [root LICENSE file](../LICENSE) for full terms.

> **Note**: The SDK is free and open source. Dataflare API access requires a paid
> subscription. See [dataflare.com/developers](https://dataflare.com/developers).
