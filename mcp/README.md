# Dataflare MCP Server [![npm version](https://img.shields.io/npm/v/dataflare-mcp-server?color=blue)](https://www.npmjs.com/package/dataflare-mcp-server)

MCP server for the Dataflare API. It exposes Dataflare's dataset search and document retrieval capabilities as tools that AI agents (like Claude Desktop) can call natively.

## What is this?

This server provides 4 specialized tools for interacting with Dataflare datasets:
- `query_datasets`: Search and paginate documents within a dataset.
- `list_datasets`: Discover available dataset categories.
- `get_document`: Retrieve a full document by its ID.
- `download_document`: Download raw files (PDFs, etc.) to your local machine.

## Installation

### Prerequisites
- Node.js ≥ 18
- Dataflare API Key ([Get one here](https://dataflare.com/developers))

### Install via NPM
```bash
npm install -g dataflare-mcp-server
```

### Build from Source
```bash
git clone https://github.com/dataflarelab/df-sdk.git
cd df-sdk/mcp
npm install
npm run build
```

## Configuration

The server requires the `DF_API_KEY` environment variable to be set.

### Claude Desktop Integration

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dataflare": {
      "command": "npx",
      "args": ["-y", "dataflare-mcp-server"],
      "env": {
        "DF_API_KEY": "dfk_your_key_here"
      }
    }
  }
}
```

Or if running from the local build:

```json
{
  "mcpServers": {
    "dataflare": {
      "command": "node",
      "args": ["/path/to/df-sdk/mcp/dist/index.js"],
      "env": {
        "DF_API_KEY": "dfk_your_key_here"
      }
    }
  }
}
```

## Available Tools

| Tool | Description | Key Parameters |
|---|---|---|
| `query_datasets` | Search documents | `dataset`, `search_term`, `limit`, `cursor` |
| `list_datasets` | List available datasets | None |
| `get_document` | Get full document | `dataset`, `document_id` |
| `download_document` | Download raw file | `source_url`, `destination` |

## Example Agent Interactions

1. "Search for recent legal cases about intellectual property in the 'legal' dataset."
2. "What datasets are available in Dataflare?"
3. "Download the source file for document 'doc-123' to my Downloads folder."

## 🛡️ License

MIT — see the [root LICENSE file](../LICENSE) for full terms.

> **Note**: The SDK is free and open source. Dataflare API access requires a paid
> subscription. See [dataflare.com/developers](https://dataflare.com/developers).
