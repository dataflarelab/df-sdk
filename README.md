# Dataflare SDKs

[![Python SDK Tests](https://github.com/dataflarelab/df-sdk/actions/workflows/python-test.yml/badge.svg)](https://github.com/dataflarelab/df-sdk/actions/workflows/python-test.yml)
[![TypeScript SDK Tests](https://github.com/dataflarelab/df-sdk/actions/workflows/typescript-test.yml/badge.svg)](https://github.com/dataflarelab/df-sdk/actions/workflows/typescript-test.yml)
[![Go SDK Tests](https://github.com/dataflarelab/df-sdk/actions/workflows/go-test.yml/badge.svg)](https://github.com/dataflarelab/df-sdk/actions/workflows/go-test.yml)
[![MCP Server Tests](https://github.com/dataflarelab/df-sdk/actions/workflows/mcp-test.yml/badge.svg)](https://github.com/dataflarelab/df-sdk/actions/workflows/mcp-test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/dataflarelab/df-sdk/blob/main/LICENSE)

Official, professional-grade SDKs for the **[Dataflare API](https://dataflare.com/developers)**. This monorepo contains high-performance, idiomatic clients for Python, TypeScript, and Go — optimized for data pipelines and AI-native applications.

---

## What is Dataflare?

Dataflare is a structured data platform providing curated, searchable datasets via both REST and high-performance gRPC APIs. The SDKs in this repo make it easy to integrate Dataflare into any application — from data pipelines to LLM-powered tools.

---

## Unified Features

| Feature | Python | TypeScript | Go |
|---|:---:|:---:|:---:|
| REST Client | ✅ | ✅ | ✅ |
| gRPC Client | ✅ | ✅ | ✅ |
| Typed Models | Pydantic | Zod | Structs |
| Auto Pagination | ✅ | ✅ | ✅ |
| Exponential Backoff | ✅ | ✅ | ✅ |
| Memory-safe File Download | ✅ | ✅ | ✅ |
| Custom Error Classes | ✅ | ✅ | ✅ |

---

## Installation

### Python

```bash
pip install dataflare-sdk

# With gRPC support
pip install "dataflare-sdk[grpc]"
```

### TypeScript / Node.js

```bash
npm install dataflare-sdk
```

### Go

```bash
go get github.com/dataflarelab/df-sdk/go
```

---

## Authentication

All SDKs read your API key from the `DF_API_KEY` environment variable by default:

```bash
export DF_API_KEY="dfk_your_key_here"
```

You can also pass it explicitly at client construction time. See the per-SDK docs below for details.

---

## Quick Start

### Python

```python
from dataflare import DFClient, AuthenticationError

with DFClient() as client:
    for doc in client.datasets.stream("legal", search_term="contract", limit=100):
        print(doc.title, doc.summary)
```

### TypeScript

```typescript
import { DFClient } from "dataflare-sdk";

const client = new DFClient();

for await (const doc of client.datasets.stream("legal", { limit: 100 })) {
  console.log(doc.id, doc.title);
}
```

### Go

```go
client := dataflare.NewClient()
docs, nextCursor, err := client.Datasets.Query("legal", dataflare.QueryOptions{Limit: 100})
```

---

## Per-SDK Documentation

- [Python Documentation](./python/README.md)
- [TypeScript Documentation](./typescript/README.md)
- [Go Documentation](./go/README.md)

For full integration guides, architectural deep-dives, and interactive API references, visit the **[Dataflare Developer Portal](https://dataflare.com/developers)**.

---

## REST vs gRPC — When to Choose What

| | REST | gRPC |
|---|---|---|
| **Best for** | General use, simple integrations | High-throughput pipelines, low latency |
| **Protocol** | HTTP/1.1 + JSON | HTTP/2 + Protobuf (binary) |
| **Streaming** | Cursor-based pagination | Native server-side streaming |
| **Setup** | Zero extra deps | Requires `[grpc]` extra (Python) or `@grpc/grpc-js` (TS) |

> **Note:** The gRPC client uses Server Reflection — your Dataflare plan must support gRPC access.

---

## License

[MIT](./LICENSE) — Copyright © 2026 Dataflare Lab