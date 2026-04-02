# df-sdk v0.2.0 — Engineering Plan
**Status:** Draft  
**Date:** April 2, 2026  
**Author:** Engineering  
**Target Release:** Q2 2026

---

## 1. Executive Summary

v0.1.9 established a solid foundation: REST + gRPC clients in Python, TypeScript, and Go, an MCP server for AI agent tooling, and a unified release pipeline. However, the SDK carries several correctness bugs across all three language SDKs and inconsistencies that hurt developer experience.

**v0.2.0 theme: "Bug Fixes + Quality"**

The release has two goals:

1. **Fix known bugs** — address all correctness issues identified during the v0.1.9 audit (Go retry body bug, deprecated gRPC dial, TypeScript dead dependency, Python dead-code retry helper, MCP hardcoded datasets, etc.).
2. **Raise the baseline** — add field projection (`fields`), offset pagination, a CHANGELOG, integration-test scaffolding, and OpenTelemetry hooks.

---

## 2. Change Summary Table

| Area | Type | Item | SDK(s) |
|------|------|------|--------|
| **Bugs** | 🐛 Fix | `QueryBuilder.Execute()` is a stub — never calls service | Go |
| **Bugs** | 🐛 Fix | Retry loop reuses exhausted `io.Reader` for request body | Go |
| **Bugs** | 🐛 Fix | `grpc.Dial` deprecated — replace with `grpc.NewClient` | Go |
| **Bugs** | 🐛 Fix | gRPC client uses `insecure.NewCredentials()` for prod TLS target | Go |
| **Bugs** | 🐛 Fix | `_should_retry_error` missing `@staticmethod` — is dead code | Python |
| **Bugs** | 🐛 Fix | `DatasetDocument.id` alias `_id` mismatches REST response `id` field | Python |
| **Bugs** | 🐛 Fix | `axios` is a listed prod dep but never imported (uses native `fetch`) | TypeScript |
| **Bugs** | 🐛 Fix | `list_datasets` MCP tool is hardcoded with two static dataset names | MCP |
| **Bugs** | 🐛 Fix | `get_document` MCP tool does O(n) stream scan instead of `filters` | MCP |
| **Bugs** | 🐛 Fix | `query_datasets` MCP tool exhausts all pages; cursor never returned | MCP |
| **Bugs** | 🐛 Fix | MCP `server.ts` version hardcoded `"0.1.0"`, not from `package.json` | MCP |
| **Enhancement** | ✨ Improve | Add API key format validation (`dfk_` prefix check) | Go |
| **Enhancement** | ✨ Improve | Add `fields []string` projection param to `Query`/`Stream` | All |
| **Enhancement** | ✨ Improve | Add `offset int` skip param for text-search pagination | All |
| **Enhancement** | ✨ Improve | Add `total_count` field to dataset response models | All |
| **Enhancement** | ✨ Improve | Export `QueryBuilder`, `ProtobufUtils`, `DatasetGRPCService` | TypeScript |
| **Enhancement** | ✨ Improve | Version-stamp `User-Agent` header dynamically | TypeScript |
| **Enhancement** | ✨ Improve | Add `go/v*` tag support to `release.sh` | Tooling |
| **Enhancement** | ✨ Improve | Integration test scaffolding (against live or docker API) | All |
| **Enhancement** | ✨ Improve | `CHANGELOG.md` with release history | Monorepo |
| **Enhancement** | ✨ Improve | OpenTelemetry trace/span hooks (opt-in) | Python, TypeScript |

---

## 3. Detailed Per-SDK Breakdown

### 3.1 Go SDK (`go/`)

#### 3.1.1 Bug Fixes

**[P0] Fix `QueryBuilder.Execute()` stub**
```go
// CURRENT (broken):
func (b *QueryBuilder) Execute() ([]interface{}, error) {
    fmt.Printf("Executing query...") // ← TODO stub, never calls service
    return []interface{}{}, nil
}

// FIXED:
func (b *QueryBuilder) Execute(ctx context.Context) (*models.DatasetResponse, error) {
    return b.service.Query(ctx, b.dataset, b.Params())
}
```
Also add a `Stream(ctx context.Context)` method to `QueryBuilder` that delegates to `service.Stream()`.

**[P0] Fix retry body reader exhaustion**
```go
// CURRENT (broken): bodyReader created once, exhausted after attempt 0
bodyReader = bytes.NewBuffer(jsonBody) // outside retry loop

// FIXED: marshal body once, rebuild reader on each attempt
var jsonBody []byte
if body != nil {
    var err error
    jsonBody, err = json.Marshal(body)
    // ...
}
// Inside retry loop:
var r io.Reader
if jsonBody != nil {
    r = bytes.NewReader(jsonBody) // bytes.NewReader is re-seekable
}
req, err := http.NewRequestWithContext(ctx, method, url, r)
```

**[P0] Replace deprecated `grpc.Dial` with `grpc.NewClient`**
```go
// CURRENT (deprecated since gRPC-Go v1.64):
conn, err := grpc.Dial(target, grpc.WithTransportCredentials(insecure.NewCredentials()))

// FIXED — with TLS for production:
import "google.golang.org/grpc/credentials"
conn, err := grpc.NewClient(target, grpc.WithTransportCredentials(credentials.NewTLS(nil)))
// Allow override to insecure for local testing via option
```

**[P1] Add API key format validation**
```go
func validateAPIKey(key string) error {
    matched, _ := regexp.MatchString(`^dfk_[a-zA-Z0-9]{40,64}$`, key)
    if !matched {
        return NewAuthenticationError("invalid API key format: expected dfk_ prefix followed by 40-64 alphanumeric characters")
    }
    return nil
}
```


**[P1] Add `fields` and `offset` to `DatasetQueryParams`**
Introduce a typed options struct instead of `map[string]interface{}`:
```go
type QueryOptions struct {
    SearchTerm string
    Filters    map[string]interface{}
    Fields     []string
    Limit      int
    Offset     int
    Cursor     string
}
```
Update `DatasetService.Query` and `Stream` signatures:
```go
func (s *DatasetService) Query(ctx context.Context, dataset string, opts *QueryOptions) (*models.DatasetResponse, error)
```

**[P1] Update `models.DatasetResponse`**
```go
type DatasetResponse struct {
    Dataset    string     `json:"dataset"`
    Data       []Document `json:"data"`
    Count      int        `json:"count"`
    TotalCount int64      `json:"total_count"` // ← new
    NextCursor string     `json:"next_cursor"`
    Latency    string     `json:"latency"`
    Fields     []string   `json:"fields"`
}
```


---

### 3.2 Python SDK (`python/`)

#### 3.2.1 Bug Fixes

**[P0] Fix `_should_retry_error` dead code**
```python
# CURRENT (broken — missing self, never called):
def _should_retry_error(exc: Exception) -> bool: ...

# FIXED — make it a module-level helper or @staticmethod:
@staticmethod
def _should_retry_error(exc: Exception) -> bool:
    if isinstance(exc, RateLimitError): return True
    if isinstance(exc, APIError) and exc.status_code and exc.status_code >= 500: return True
    if isinstance(exc, httpx.RequestError): return True
    return False
```
Wire it into the `retry_if` condition of `tenacity`.

**[P0] Fix `DatasetDocument.id` alias mismatch**
The REST API normalizes `_id` → `id` server-side before responding. The SDK model's `alias="_id"` therefore never matches.
```python
# CURRENT:
id: Optional[str] = Field(default=None, alias="_id")

# FIXED — accept both for backward compat:
id: Optional[str] = Field(default=None, validation_alias=AliasChoices("id", "_id"))
```

#### 3.2.2 Enhancements

**[P1] Add `fields` and `offset` to `query()` / `stream()`**
```python
def query(
    self,
    dataset: str,
    search_term: Optional[str] = None,
    filters: Optional[Dict[str, Any]] = None,
    fields: Optional[List[str]] = None,   # ← new
    limit: int = 100,
    offset: int = 0,                       # ← new
    cursor: Optional[str] = None,
) -> DatasetQueryResponse: ...
```

**[P1] Add `total_count` to `DatasetQueryResponse`**
```python
class DatasetQueryResponse(BaseModel):
    data: List[DatasetDocument]
    count: int
    total_count: Optional[int] = None   # ← new
    next_cursor: Optional[str] = None
    latency: Optional[str] = None
```


**[P2] OpenTelemetry hooks (opt-in)**
```python
# Optional extra: pip install dataflare-sdk[otel]
# Automatically instruments HTTP spans if opentelemetry-api is installed
```

---

### 3.3 TypeScript SDK (`typescript/`)

#### 3.3.1 Bug Fixes

**[P0] Remove unused `axios` dependency**
```json
// package.json — remove from "dependencies":
"axios": "^1.13.6"  // ← DELETE — only native fetch is used
```
Also remove `axios-mock-adapter` from devDependencies and clean up any stale imports.

**[P1] Export `QueryBuilder`, `ProtobufUtils`, `DatasetGRPCService`**
```typescript
// src/index.ts — add:
export * from './services/query-builder';
export { ProtobufUtils, DatasetGRPCService } from './grpc-client';
```

**[P1] Dynamic `User-Agent` version**
```typescript
// Read from package.json at build time via tsup define or import
import { version } from '../package.json';
'User-Agent': `df-typescript/${version}`,
```

#### 3.3.2 Enhancements

**[P1] Add `fields` and `offset` to `DatasetQueryRequest`**
```typescript
export const DatasetQueryRequestSchema = z.object({
    dataset: z.string(),
    limit: z.number().max(1000).optional(),
    cursor: z.string().optional(),
    search_term: z.string().optional(),
    filters: z.record(z.string(), z.any()).optional(),
    fields: z.array(z.string()).optional(),  // ← new
    offset: z.number().min(0).optional(),    // ← new
});
```

**[P1] Add `total_count` to `DatasetQueryResponseSchema`**
```typescript
export const DatasetQueryResponseSchema = z.object({
    data: z.array(DatasetDocumentSchema),
    count: z.number().optional().default(0),
    total_count: z.number().optional(),    // ← new
    next_cursor: z.string().nullable().optional(),
    latency: z.string().optional(),
});
```

**[P1] Add `fields` and `offset` to `QueryBuilder`**
```typescript
fields(projection: string[]): this { this._fields = projection; return this; }
offset(n: number): this { this._offset = n; return this; }
```

**[P2] OpenTelemetry hooks (opt-in)**
```typescript
// Optional extra — zero-cost if @opentelemetry/api is not installed
// Wraps client.request() in a span: df.datasets.query, df.datasets.stream, etc.
```

---

### 3.4 MCP Server (`mcp/`)

#### 3.4.1 Bug Fixes

**[P0] Dynamic `list_datasets` tool**

Replace the hardcoded response with a live API call:
```typescript
// CURRENT (hardcoded):
text: `Available Dataflare datasets:\n- legal: ...\n- financial: ...`

// FIXED:
const client = getClient();
const datasets = await client.datasets.list();
text: `Available Dataflare datasets:\n${datasets.map(d => `- ${d}`).join('\n')}\n\nUse query_datasets to search within any dataset.`
```

**[P0] Fix `get_document` O(n) scan**
```typescript
// CURRENT (broken — full stream scan):
const stream = client.datasets.stream(dataset, { limit: 1 });
for await (const doc of stream) {
    if (doc.id === document_id) { ... }
}

// FIXED — use filters directly:
const result = await client.datasets.query(dataset, {
    filters: { id: document_id },
    limit: 1,
});
const foundDoc = result.data[0] ?? null;
```

**[P0] Fix `query_datasets` — return cursor to AI agent**
```typescript
// CURRENT: streams all pages and discards cursor
// FIXED: single-page query, expose next_cursor in response
const result = await client.datasets.query(dataset, {
    search_term,
    limit,
    cursor,
});
return {
    content: [{ type: "text", text: formatResults(dataset, result.data, result.next_cursor) }],
    structuredData: {
        documents: result.data,
        dataset,
        next_cursor: result.next_cursor ?? null,
        count: result.count,
    },
};
```

**[P1] Fix hardcoded server version in `server.ts`**
```typescript
// CURRENT:
version: "0.1.0"

// FIXED — read from package.json:
import { version } from '../package.json' assert { type: 'json' };
const server = new McpServer({ name: "dataflare-mcp-server", version });
```


---

## 4. Prioritized Milestones

### Milestone 1 — P0: Critical Bugs (Week 1)
> Goal: Ship a bug-free v0.1.10 patch immediately

| # | Task | SDK |
|---|------|-----|
| 1 | Fix `QueryBuilder.Execute()` stub | Go |
| 2 | Fix retry body reader exhaustion | Go |
| 3 | Fix `grpc.Dial` → `grpc.NewClient` + TLS | Go |
| 4 | Fix `_should_retry_error` dead code | Python |
| 5 | Fix `DatasetDocument.id` alias mismatch | Python |
| 6 | Remove unused `axios` dependency | TypeScript |
| 7 | Fix `list_datasets` MCP tool hardcoded response | MCP |
| 8 | Fix `get_document` O(n) stream scan | MCP |
| 9 | Fix `query_datasets` full-stream with cursor loss | MCP |

### Milestone 2 — P1: Enhancements (Weeks 2–3)
> Goal: Field projection, offset, `total_count`, type exports, User-Agent versioning, Go tag support

| # | Task | SDK |
|---|------|-----|
| 10 | `fields` + `offset` params + `total_count` in response | Python |
| 11 | `fields` + `offset` params + `total_count` in response | TypeScript |
| 12 | `fields` + `offset` params + `total_count` in response | Go |
| 13 | API key format validation | Go |
| 14 | Export `QueryBuilder`, `ProtobufUtils`, `DatasetGRPCService` from index | TypeScript |
| 15 | Dynamic `User-Agent` with version | TypeScript |
| 16 | Fix MCP server hardcoded version | MCP |
| 17 | Add `go/v*` tag support in `release.sh` | Tooling |

### Milestone 3 — P2: Quality & DX (Week 4)
> Goal: Integration tests, OTel hooks, CHANGELOG

| # | Task | SDK |
|---|------|-----|
| 18 | OpenTelemetry opt-in hooks | Python, TypeScript |
| 19 | Integration test scaffolding (docker-compose) | All |
| 20 | `CHANGELOG.md` with full history | Monorepo |

---

## 5. Updated Dataset Models

### 5.1 Updated `DatasetQueryResponse`

```
DatasetQueryResponse {
    data:        Document[]
    count:       int
    total_count: int64    // ← NEW — estimated total in collection
    next_cursor: string?
    latency:     string?
    fields:      string[]
}
```

### 5.2 Updated `QueryOptions` / `DatasetQueryRequest`

```
QueryOptions / DatasetQueryRequest {
    limit?:       int
    cursor?:      string
    search_term?: string
    filters?:     map<string, any>
    fields?:      string[]    // ← NEW — server-side projection
    offset?:      int         // ← NEW — skip N results (text search)
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests (current state — keep improving)

- **Python**: `pytest` + `respx` for HTTP mocking. Add tests for all new services.
- **TypeScript**: `vitest` + `vi.stubGlobal('fetch', vi.fn())`. Add tests for all new services.
- **Go**: `httptest.NewServer`. Add table-driven tests for retry logic, new services.
- **MCP**: Add `vitest` tests for all new tools using the fixed architecture.

### 6.2 Integration Tests (new in v0.2.0)

Add a `tests/integration/` directory at the monorepo root:
```
tests/
  integration/
    docker-compose.yml      # spins up df-api + MongoDB stub
    python/
      test_integration.py   # requires DF_API_KEY pointing to test instance
    typescript/
      integration.test.ts
    go/
      integration_test.go   # build tag: //go:build integration
```

CI: integration tests run in a separate workflow (`integration-test.yml`) triggered on PR merge to `main`, not on every PR.

### 6.3 Coverage Targets

| SDK | Current | v0.2.0 Target |
|-----|---------|--------------|
| Python | ~60% | 80% |
| TypeScript | ~55% | 80% |
| Go | ~40% | 75% |
| MCP | ~30% | 70% |

---

## 7. Release & Versioning Strategy

### 7.1 Version Numbers

Since all SDKs currently ship in lockstep at `0.1.9`, we continue this for `0.2.0`. The patch release for P0 bugs will be `0.1.10`.

| Release | Contents | When |
|---------|----------|------|
| `v0.1.10` | P0 bug fixes only | Week 1 |
| `v0.2.0` | Full v0.2.0 feature set | End of Week 5 |

### 7.2 Git Tags

Current scheme:
- `py/v0.2.0` → PyPI
- `ts/v0.2.0` → npm
- `mcp/v0.2.0` → npm

**Add for v0.2.0:**
- `go/v0.2.0` → Go module proxy (requires `go/` directory to be a proper module root)

Update `release.sh`:
```bash
# Add --go flag option
if $GO; then
  TAGS+=("go/v$VERSION")
fi
```

### 7.3 Breaking Changes

v0.2.0 introduces **no breaking changes** to existing method signatures. All new parameters are optional with backward-compatible defaults. The only potentially breaking change is in Go where `DatasetService.Query` may change from `map[string]interface{}` to `*QueryOptions` — a migration guide will be included.

---

## 8. Effort Estimates

| Milestone | Items | Estimated Effort |
|-----------|-------|-----------------|
| M1 — P0 Bug Fixes | 9 items | 2–3 days |
| M2 — P1 Enhancements | 8 items | 4–5 days |
| M3 — P2 Quality & DX | 3 items | 2–3 days |
| **Total** | **20 items** | **~2 weeks** |

---

## 9. Open Questions

1. **gRPC `NewClient` TLS** — should there be an explicit `WithTLS(bool)` option, or always-TLS with a `WithInsecure()` escape hatch for local testing?
2. **OTel span naming** — agree on a convention: `df.datasets.query`, `df.datasets.stream`, etc.
3. **Go module path** — currently `github.com/dataflarelab/df-sdk/go`. For Go module versioning `go/v0.2.0` tag requires the import path to remain the same (v0.x does not need `/v2`). Confirm no import path change needed.
4. **`fields` projection + `offset` for cursor mode** — `offset` is documented as text-search only on the backend; should the SDK return an error or silently ignore `offset` when `search_term` is empty?

---

## 10. Appendix — File Map

### Files to Modify

```
go/client.go                         ← fix body reader reuse in retry loop
go/grpc_client.go                    ← grpc.NewClient + TLS
go/query_builder.go                  ← fix Execute(); add Stream(); adopt QueryOptions
go/models/dataset.go                 ← add TotalCount; introduce QueryOptions struct
go/exceptions.go                     ← (no changes)

python/src/df/client.py              ← (no structural changes)
python/src/df/services/datasets.py   ← fix _should_retry_error; add fields/offset
python/src/df/services/async_datasets.py ← add fields/offset
python/src/df/models/dataset.py      ← fix id alias; add total_count

typescript/src/client.ts             ← dynamic User-Agent version
typescript/src/services/datasets.ts  ← add fields/offset to query/stream
typescript/src/services/query-builder.ts ← add fields()/offset() methods
typescript/src/models/dataset.ts     ← add total_count, fields, offset to schemas
typescript/src/index.ts              ← export QueryBuilder, ProtobufUtils, DatasetGRPCService
typescript/package.json              ← remove axios + axios-mock-adapter

mcp/src/tools/list_datasets.ts       ← dynamic API call instead of hardcoded strings
mcp/src/tools/get_document.ts        ← use filters instead of stream scan
mcp/src/tools/query_datasets.ts      ← single-page query with cursor exposed
mcp/src/server.ts                    ← dynamic version from package.json

scripts/release.sh                   ← add go/v* tag support
scripts/sync-versions.sh             ← add Go version sync
```

### Files to Create

```
CHANGELOG.md                         ← monorepo root
tests/integration/
  docker-compose.yml
  python/test_integration.py
  typescript/integration.test.ts
  go/integration_test.go
```

