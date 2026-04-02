# Changelog

## [0.1.9] - 2026-04-02

### Added
- **All SDKs**: Added `fields` (server-side projection) and `offset` (pagination skip) parameters to `query` and `stream` methods.
- **All SDKs**: Added `total_count` to the `DatasetQueryResponse` model for estimating total collection size.
- **Go**: Added `QueryOptions` struct to replace generic `map[string]interface{}` parameters in `DatasetService`.
- **Go**: Added API key format validation (`dfk_` prefix check).
- **TypeScript**: Exported `QueryBuilder`, `ProtobufUtils`, and `DatasetGRPCService` for advanced use cases.
- **MCP**: Added dynamic server versioning from `package.json`.
- **Tooling**: Added `go/v*` tag support to `release.sh`.

### Fixed
- **Go**: Fixed `QueryBuilder.Execute()` which was previously a stub; it now correctly calls the service.
- **Go**: Fixed a critical bug in the retry loop where the request body `io.Reader` was exhausted after the first attempt.
- **Go**: Replaced deprecated `grpc.Dial` with `grpc.NewClient` and implemented automated TLS support for production targets.
- **Python**: Fixed `_should_retry_error` which was dead code (missing `@staticmethod`); it is now correctly integrated with the `tenacity` retry loop.
- **Python**: Fixed `DatasetDocument.id` alias mismatch; it now correctly accepts both `id` and `_id` from the REST API.
- **TypeScript**: Removed unused `axios` and `axios-mock-adapter` dependencies (the SDK uses native `fetch`).
- **MCP**: Fixed `list_datasets` tool to use a dynamic API call instead of a hardcoded list.
- **MCP**: Fixed `get_document` tool to use a filtered query instead of an inefficient $O(n)$ stream scan.
- **MCP**: Fixed `query_datasets` tool to return the pagination cursor to the AI agent.

## [0.1.9] - 2026-03-25
- Foundation release: Typescript, Python, Go clients.
- MCP Server introduction.
- Unified release pipeline.
