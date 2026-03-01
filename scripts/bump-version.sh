#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 0.1.0"
  exit 1
fi

VERSION="$1"

# Validate semver format (basic check)
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "Error: version must be in semver format (e.g. 0.1.0)"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Bumping all versions to $VERSION"

# 1. Cargo.toml workspace version
sed -i.bak "s/^version = \".*\"/version = \"$VERSION\"/" "$REPO_ROOT/Cargo.toml"
rm "$REPO_ROOT/Cargo.toml.bak"
echo "  Updated Cargo.toml"

# 2-4. JSON package files via jq
for pkg in \
  "$REPO_ROOT/package.json" \
  "$REPO_ROOT/apps/frontend/package.json" \
  "$REPO_ROOT/apps/desktop/package.json"; do
  tmp=$(mktemp)
  jq --arg v "$VERSION" '.version = $v' "$pkg" > "$tmp" && mv "$tmp" "$pkg"
  echo "  Updated $(basename "$(dirname "$pkg")")/$(basename "$pkg")"
done

# 5. tauri.conf.json
TAURI_CONF="$REPO_ROOT/apps/desktop/src-tauri/tauri.conf.json"
tmp=$(mktemp)
jq --arg v "$VERSION" '.version = $v' "$TAURI_CONF" > "$tmp" && mv "$tmp" "$TAURI_CONF"
echo "  Updated tauri.conf.json"

echo ""
echo "All versions set to $VERSION"
echo "Next steps:"
echo "  git add -A && git commit -m \"chore: bump version to $VERSION\""
echo "  git tag v$VERSION"
echo "  git push && git push --tags"
