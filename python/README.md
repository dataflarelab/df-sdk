# DF API Python SDK `<a href="https://pypi.org/project/dataflare-sdk/"><img alt="PyPI" src="https://img.shields.io/pypi/v/dataflare-sdk?color=blue"></a>`

The official Python SDK for the **DataFlare API**.

## Features
- **Typed Models:** Full Pydantic schemas mapping the Datasets API for rigid IDE autocompletion.
- **Connection Pools:** Subclass optimized `httpx` logic reusing TCP connections seamlessly.
- **Resilient Requests:** Automated retries (`tenacity`) wrapping Rate Limit and transient network faults over exponential backoffs.
- **Idiomatic Paginators:** `client.datasets.stream(...)` automatically handles cursor injection iteratively returning stream chunks cleanly.
- **Memory-safe Source Retrieval:** For pipelines feeding Large Language Models directly from data archives, effortlessly invoke `download_file(...)` natively chunking raw bytes down to the file system avoiding memory leaks.

## Installation

```bash
pip install dataflare-sdk
```

## Quick Start

You will need a DataFlare API Key. The easiest way is setting an environment variable:
```bash
export DF_API_KEY="dfk_abc123"
```

```python
from df import DFClient, AuthenticationError

# Automatically discovers DF_API_KEY from the environment
try:
    with DFClient() as client:
        
        # Generator handles pagination constraints completely
        for doc in client.datasets.stream("legal", search_term="التأمين", limit=100):
            print(f"Doc ID: {doc.id} | Metadata: {doc.metadata}")
            
            # Helper to download the raw PDF to disk natively
            if doc.source_url:
                client.datasets.download_file(
                    doc.source_url, 
                    destination=f"./archives/{doc.id}.pdf"
                )

except AuthenticationError:
    print("Invalid API Key.")
```
