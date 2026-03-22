# Dataflare Go SDK

Official Go client for the Dataflare API. High-concurrency, idiomatic, and performance-optimized with native channel-based streaming and gRPC.

## Installation

```bash
go get github.com/dataflarelab/df-sdk/go
```

## Quick Start (REST)

```go
package main

import (
    "fmt"
    "github.com/dataflarelab/df-sdk/go"
)

func main() {
    client := dataflare.NewClient(&dataflare.ClientOptions{
        APIKey: "your_api_key",
    })

    // Stream a dataset using Go channels
    docChan, errChan := client.Datasets.Stream("legal", nil)

    for doc := range docChan {
        fmt.Println("Received doc:", doc.ID)
    }

    if err := <-errChan; err != nil {
        panic(err)
    }
}
```

## gRPC Integration (High Performance)

```go
client, _ := dataflare.NewGRPCClient("rpc.dataflare.com:443")
defer client.Close()

// Calls use gRPC reflection and binary protocol
```

## Error Handling

The SDK provides specialized error types for robust pipeline integration:

- `dataflare.AuthenticationError`: Invalid API key.
- `dataflare.RateLimitError`: Request limit exceeded (automatic retries included in REST).
- `dataflare.APIError`: Server-side faults.

## Documentation

Full documentation is available at [dataflare.com/developers](https://dataflare.com/developers#go-sdk).

## 🛡️ License

MIT — see the [root LICENSE file](../LICENSE) for full terms.

> **Note**: The SDK is free and open source. Dataflare API access requires a paid
> subscription. See [dataflare.com/developers](https://dataflare.com/developers).
