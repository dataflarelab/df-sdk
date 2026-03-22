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

# 3. Python version is handled by hatch-vcs (from tags),
# so we don't need to update it in pyproject.toml manually
# but we can verify it's correctly configured.

echo "Synchronization complete. Please verify the changes and commit."
