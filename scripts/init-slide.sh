#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -z "$1" ]; then
  echo "Usage: bun run init:slide <slide-name>"
  exit 1
fi

# Always lowercase the slide name so folder and package.json name match
# (required for `bun --filter='./slide-name'` to work)
SLIDE_NAME="$(echo "$1" | tr '[:upper:]' '[:lower:]')"
SLIDE_DIR="$ROOT_DIR/$SLIDE_NAME"

if [ -d "$SLIDE_DIR" ]; then
  echo "Error: Directory '$SLIDE_NAME' already exists"
  exit 1
fi

echo "Creating slide: $SLIDE_NAME"

# Copy template
cp -r "$ROOT_DIR/_template" "$SLIDE_DIR"

# Replace placeholder in package.json
sed -i '' "s|\"name\": \"SLIDE_NAME\"|\"name\": \"$SLIDE_NAME\"|g" "$SLIDE_DIR/package.json"

# Add to root package.json workspaces array
ROOT_PKG="$ROOT_DIR/package.json"
if ! grep -q "\"$SLIDE_NAME\"" "$ROOT_PKG"; then
  node -e "
    const fs = require('fs');
    const path = '$ROOT_PKG';
    const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
    pkg.workspaces = pkg.workspaces || [];
    if (!pkg.workspaces.includes('$SLIDE_NAME')) {
      pkg.workspaces.push('$SLIDE_NAME');
    }
    fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  "
fi

echo ""
echo "Created: $SLIDE_NAME"
echo ""
echo "Next steps:"
echo "  1. bun install"
echo "  2. bun --filter='./$SLIDE_NAME' run dev"
