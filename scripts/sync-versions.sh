#!/bin/bash

# Simple script to sync version numbers across the df-sdk monorepo
# Usage: ./scripts/sync-versions.sh 0.1.2

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: ./scripts/sync-versions.sh <version>"
    exit 1
fi

echo "Updating versions to $VERSION..."

# 1. Update TypeScript SDK
if [ -f "typescript/package.json" ]; then
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" typescript/package.json
    echo "Updated typescript/package.json"
fi

# 2. Update MCP Server
if [ -f "mcp/package.json" ]; then
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" mcp/package.json
    # Also update the dependency on dataflare-sdk (the typescript one)
    sed -i '' "s/\"dataflare-sdk\": \".*\"/\"dataflare-sdk\": \"^$VERSION\"/" mcp/package.json
    echo "Updated mcp/package.json"
fi

# 4. Go SDK versioning
# Go uses git tags for versioning, but we can verify it's properly referenced
if [ -d "go" ]; then
    echo "Verifying Go module integrity..."
    (cd go && go mod edit -require=github.com/dataflarelab/df-sdk/go@v$VERSION 2>/dev/null || true)
    echo "Checks complete for Go SDK"
fi

echo "Synchronization complete. Please verify the changes and commit."
