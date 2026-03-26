#!/bin/bash
set -euo pipefail

# =============================================================================
# df-sdk release script
# Usage: ./scripts/release.sh <version> [--dry-run]
#
# This script:
#   1. Validates the version is semver
#   2. Bumps typescript/package.json and mcp/package.json (including the
#      dataflare-sdk peer dep in mcp)
#   3. Commits all changes
#   4. Creates annotated tags: py/vX.Y.Z  ts/vX.Y.Z  mcp/vX.Y.Z
#   5. Pushes the commit + all tags
# =============================================================================

VERSION=${1:-}
DRY_RUN=false

if [ "${2:-}" = "--dry-run" ]; then
  DRY_RUN=true
fi

# ---------- helpers ----------------------------------------------------------

red()   { echo -e "\033[0;31m$*\033[0m"; }
green() { echo -e "\033[0;32m$*\033[0m"; }
blue()  { echo -e "\033[0;34m$*\033[0m"; }

run() {
  if $DRY_RUN; then
    blue "[dry-run] $*"
  else
    "$@"
  fi
}

# ---------- validation -------------------------------------------------------

if [ -z "$VERSION" ]; then
  red "Error: version argument is required"
  echo "Usage: ./scripts/release.sh <version> [--dry-run]"
  echo "Example: ./scripts/release.sh 0.1.9"
  exit 1
fi

# Validate semver (X.Y.Z or X.Y.Z-<pre>)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9._-]+)?$ ]]; then
  red "Error: '$VERSION' is not a valid semver (expected X.Y.Z or X.Y.Z-pre)"
  exit 1
fi

# Must be run from repo root
if [ ! -f "scripts/release.sh" ]; then
  red "Error: this script must be run from the repo root (df-sdk/)"
  exit 1
fi

# Ensure working tree is clean
if ! git diff --quiet || ! git diff --staged --quiet; then
  red "Error: working tree is dirty. Commit or stash changes before releasing."
  exit 1
fi

# ---------- version bumps ----------------------------------------------------

echo ""
blue "==> Bumping versions to $VERSION"

# TypeScript SDK — use npm version (no sed, handles JSON safely)
run npm --prefix typescript version "$VERSION" --no-git-tag-version
echo "    ✓ typescript/package.json"

# MCP: bump its own version
run npm --prefix mcp version "$VERSION" --no-git-tag-version
echo "    ✓ mcp/package.json (version)"

# MCP: update the dataflare-sdk peer dep to the new version
if $DRY_RUN; then
  blue "[dry-run] update mcp/package.json dataflare-sdk dep -> ^$VERSION"
else
  # Use node for safe, precise JSON editing
  node -e "
    const fs = require('fs');
    const p = 'mcp/package.json';
    const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
    pkg.dependencies['dataflare-sdk'] = '^$VERSION';
    fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
  "
fi
echo "    ✓ mcp/package.json (dataflare-sdk dep)"

# Python: version is derived from the git tag via hatch-vcs, no file to edit.
echo "    - python: version comes from git tag (hatch-vcs) — no file change needed"

# ---------- commit -----------------------------------------------------------

echo ""
blue "==> Committing"
run git add typescript/package.json mcp/package.json
run git commit -m "chore: release v$VERSION"

# ---------- tags -------------------------------------------------------------

echo ""
blue "==> Creating annotated tags"

TAGS=("py/v$VERSION" "ts/v$VERSION" "mcp/v$VERSION")
for TAG in "${TAGS[@]}"; do
  run git tag -a "$TAG" -m "Release $TAG"
  echo "    ✓ $TAG"
done

# ---------- push -------------------------------------------------------------

echo ""
blue "==> Pushing commit + tags"
run git push origin HEAD
run git push origin "${TAGS[@]}"

# ---------- done -------------------------------------------------------------

echo ""
green "==> Release v$VERSION complete!"
if $DRY_RUN; then
  echo ""
  blue "This was a dry-run. No changes were committed or pushed."
fi
