#!/bin/bash
set -euo pipefail

# =============================================================================
# df-sdk release script
# Usage: ./scripts/release.sh <version> [--dry-run] [--python-only]
#
# This script:
#   1. Validates the version is semver
#   2. Bumps versions in typescript/ and mcp/ (skipped if --python-only)
#   3. Commits all changes (skipped if no changes or --python-only)
#   4. Removes OLD tags if they exist (local + remote) to handle bugs/retries
#   5. Creates annotated tags: py/vX.Y.Z (and ts/v*, mcp/v* if not --python-only)
#   6. Pushes the commit + tags
# =============================================================================

VERSION=""
DRY_RUN=false
PYTHON_ONLY=false

# Simple arg parsing
for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --python-only) PYTHON_ONLY=true ;;
    *)
      if [[ -z "$VERSION" && ! "$arg" =~ ^- ]]; then
        VERSION=$arg
      fi
      ;;
  esac
done

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

cleanup_tag() {
  local TAG=$1
  echo "    - Checking if tag $TAG needs cleanup..."
  if git tag -l | grep -q "^$TAG$"; then
    echo "      ✓ Tag $TAG removed locally"
    run git tag -d "$TAG"
  fi
  if ! $DRY_RUN; then
    # Silence errors if tag doesn't exist on remote
    git push origin --delete "$TAG" 2>/dev/null || true
    echo "      ✓ Tag $TAG cleanup attempted on origin"
  fi
}

# ---------- validation -------------------------------------------------------

if [ -z "$VERSION" ]; then
  red "Error: version argument is required"
  echo "Usage: ./scripts/release.sh <version> [--dry-run] [--python-only]"
  echo "Example: ./scripts/release.sh 0.1.9 --python-only"
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

# Ensure working tree is clean (only if we expect to commit)
if ! $PYTHON_ONLY; then
  if ! git diff --quiet || ! git diff --staged --quiet; then
    red "Error: working tree is dirty. Commit or stash changes before releasing."
    exit 1
  fi
fi

# ---------- version bumps (skipped for --python-only) ------------------------

if ! $PYTHON_ONLY; then
  echo ""
  blue "==> Bumping versions to $VERSION"

  # TypeScript SDK
  run npm --prefix typescript version "$VERSION" --no-git-tag-version
  echo "    ✓ typescript/package.json"

  # MCP: bump its own version
  run npm --prefix mcp version "$VERSION" --no-git-tag-version
  echo "    ✓ mcp/package.json (version)"

  # MCP: update the dataflare-sdk dep
  if $DRY_RUN; then
    blue "[dry-run] update mcp/package.json dataflare-sdk dep -> ^$VERSION"
  else
    node -e "
      const fs = require('fs');
      const p = 'mcp/package.json';
      const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
      pkg.dependencies['dataflare-sdk'] = '^$VERSION';
      fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
    "
  fi
  echo "    ✓ mcp/package.json (dataflare-sdk dep)"
  
  # Commit version bumps
  echo ""
  blue "==> Committing version bumps"
  run git add typescript/package.json mcp/package.json
  # Skip commit if nothing changed (re-tagging same version)
  if git diff --staged --quiet; then
    echo "    - No version changes to commit (already at $VERSION)"
  else
    run git commit -m "chore: release v$VERSION"
  fi
else
  echo ""
  blue "==> Mode: Python Only (skipping JS/TS version bumps and commits)"
fi

# ---------- tag cleanup & creation -------------------------------------------

echo ""
blue "==> Preparing tags for v$VERSION"

if $PYTHON_ONLY; then
  TAGS=("py/v$VERSION")
else
  TAGS=("py/v$VERSION" "ts/v$VERSION" "mcp/v$VERSION")
fi

for TAG in "${TAGS[@]}"; do
  cleanup_tag "$TAG"
  run git tag -a "$TAG" -m "Release $TAG"
  echo "    ✓ Tag created: $TAG"
done

# ---------- push -------------------------------------------------------------

echo ""
blue "==> Pushing to origin"

if ! $PYTHON_ONLY; then
  # Only push HEAD if we (potentially) made a commit
  run git push origin HEAD
fi

run git push origin "${TAGS[@]}"

# ---------- done -------------------------------------------------------------

echo ""
green "==> Release v$VERSION complete!"
if $PYTHON_ONLY; then
  echo "    Note: Only Python tags were updated."
fi
if $DRY_RUN; then
  echo ""
  blue "This was a dry-run. No changes were committed or pushed."
fi
