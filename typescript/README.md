# Dataflare TypeScript SDK

[![npm version](https://img.shields.io/npm/v/dataflare-sdk)](https://www.npmjs.com/package/dataflare-sdk)
[![TypeScript SDK Tests](https://github.com/dataflarelab/df-sdk/actions/workflows/typescript-test.yml/badge.svg)](https://github.com/dataflarelab/df-sdk/actions/workflows/typescript-test.yml)

Official TypeScript/Node.js client for the Dataflare API. High-performance, type-safe, and resilient.

---

## Features

- **Type Safety**: Built-in Zod schemas for runtime validation and full static type inference.
- **REST & gRPC**: Choose between standard HTTP or high-performance gRPC via Server Reflection.
- **Resilient**: Automatic exponential backoff for transient errors and rate limits.
- **Efficient**: Async generators for infinite streaming and memory-safe chunked file downloads.
- **Pro Exceptions**: Custom error classes (`AuthenticationError`, `RateLimitError`, `APIError`).

---

## Installation

```bash
npm install dataflare-sdk
```

For gRPC support, also install the gRPC runtime:

```bash
npm install dataflare-sdk @grpc/grpc-js
```

---

## Authentication

The SDK reads your API key from the `DF_API_KEY` environment variable automatically:

```bash
export DF_API_KEY="dfk_your_key_here"
```

Or pass it directly at construction:

```typescript
import { DFClient } from "dataflare-sdk";

const client = new DFClient({ apiKey: "dfk_your_key_here" });
```

---

## Quick Start (REST)

```typescript
import { DFClient } from "dataflare-sdk";

const client = new DFClient();

async function main() {
  // Async generator — handles cursor pagination automatically
  for await (const doc of client.datasets.stream("legal", { limit: 100 })) {
    console.log(`Title: ${doc.title} | Category: ${doc.category}`);

    // Memory-safe chunked file download
    if (doc.sourceUrl) {
      await client.datasets.downloadFile(doc.sourceUrl, `./archives/${doc.id}.pdf`);
    }
  }
}

main();
```

---

## Quick Start (gRPC)

For environments requiring persistent connections and reduced latency:

```typescript
import { DFGRPCClient } from "dataflare-sdk";

// Requires: npm install @grpc/grpc-js
const rpc = new DFGRPCClient();

async function query() {
  const [docs, nextCursor] = await rpc.datasets.query("legal", { limit: 10 });
  console.log(`Retrieved ${docs.length} documents. Next cursor: ${nextCursor}`);
}

query();
```

> **Note:** The gRPC client uses Server Reflection — make sure your Dataflare plan supports gRPC access before switching.

---

## Error Handling

```typescript
import { DFClient, AuthenticationError, RateLimitError, APIError } from "dataflare-sdk";

async function main() {
  try {
    const client = new DFClient();
    for await (const doc of client.datasets.stream("legal", { limit: 10 })) {
      console.log(doc.id);
    }
  } catch (e) {
    if (e instanceof AuthenticationError) {
      console.error("Invalid or missing API key. Set DF_API_KEY in your environment.");
    } else if (e instanceof RateLimitError) {
      console.error("Rate limit exceeded even after retries. Back off and try again later.");
    } else if (e instanceof APIError) {
      console.error(`API error ${e.statusCode}: ${e.message}`);
    } else {
      throw e;
    }
  }
}

main();
```

---

## REST vs gRPC

| | REST | gRPC |
|---|---|---|
| **Best for** | General use, simple integrations | High-throughput pipelines, low latency |
| **Protocol** | HTTP/1.1 + JSON | HTTP/2 + Protobuf (binary) |
| **Streaming** | Cursor-based async generator | Native server-side streaming |
| **Extra deps** | None | `@grpc/grpc-js` |

---

## Links

- [Root Repository](https://github.com/dataflarelab/df-sdk)
- [Dataflare Developer Portal](https://dataflare.com/developers)
- [npm Package](https://www.npmjs.com/package/dataflare-sdk)