# Dataflare TypeScript SDK [![npm version](https://img.shields.io/npm/v/dataflare-sdk?color=blue)](https://www.npmjs.com/package/dataflare-sdk)

Official TypeScript client for the Dataflare API. High-performance, type-safe, and resilient.

## Features

- **Type Safety**: Built-in Zod schemas for runtime validation and static type inference.
- **REST & gRPC**: Choice of standard HTTP or high-performance gRPC via Server Reflection.
- **Resilient**: Automatic exponential backoff for transient errors and rate limits.
- **Efficient**: Async generators for infinite streaming and memory-safe file downloads.
- **Pro Exceptions**: Custom error classes (`AuthenticationError`, `RateLimitError`, `APIError`).

## Installation

```bash
npm install dataflare-sdk
```

## Quick Start (REST)

```typescript
import { DFClient } from "dataflare-sdk";

const client = new DFClient();

async function main() {
  for await (const doc of client.datasets.stream("legal", { limit: 100 })) {
    console.log("Processing:", doc.id);
  }
}
```

## Quick Start (gRPC)

```typescript
import { DFGRPCClient } from "dataflare-sdk";

const rpc = new DFGRPCClient();

async function query() {
  const [docs, next] = await rpc.datasets.query("legal", { limit: 10 });
  console.log(`Retrieved ${docs.length} documents.`);
}
```

## Error Handling

```typescript
import { DFClient, AuthenticationError, RateLimitError } from "dataflare-sdk";

try {
  const client = new DFClient();
  // ...
} catch (e) {
  if (e instanceof AuthenticationError) {
    console.error("Invalid API Key");
  } else if (e instanceof RateLimitError) {
    console.error("Rate limit exceeded after retries");
  }
}
```

## 🛡️ License

MIT — see the [root LICENSE file](../LICENSE) for full terms.

> **Note**: The SDK is free and open source. Dataflare API access requires a paid
> subscription. See [dataflare.com/developers](https://dataflare.com/developers).
