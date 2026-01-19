#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -z "$1" ]; then
  echo "Usage: pnpm init:slide <slide-name>"
  exit 1
fi

SLIDE_NAME="$1"
SLIDE_DIR="$ROOT_DIR/$SLIDE_NAME"
PACKAGE_NAME="@slides/$(echo "$SLIDE_NAME" | tr '[:upper:]' '[:lower:]')"

if [ -d "$SLIDE_DIR" ]; then
  echo "Error: Directory '$SLIDE_NAME' already exists"
  exit 1
fi

echo "Creating slide: $SLIDE_NAME"

# Copy template
cp -r "$ROOT_DIR/_template" "$SLIDE_DIR"

# Replace placeholder in package.json
sed -i '' "s|@slides/SLIDE_NAME|$PACKAGE_NAME|g" "$SLIDE_DIR/package.json"

# Add to pnpm-workspace.yaml
if ! grep -q "\"$SLIDE_NAME\"" "$ROOT_DIR/pnpm-workspace.yaml"; then
  echo "  - \"$SLIDE_NAME\"" >> "$ROOT_DIR/pnpm-workspace.yaml"
fi

echo ""
echo "Created: $SLIDE_NAME"
echo ""
echo "Next steps:"
echo "  1. pnpm install"
echo "  2. pnpm --filter $PACKAGE_NAME dev"
