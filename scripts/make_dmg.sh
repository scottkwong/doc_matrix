#!/usr/bin/env bash
set -euo pipefail

# Create a .dmg containing the built .app
# Requires: create-dmg (brew install create-dmg)
#
# Usage:
#   ./scripts/make_dmg.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_PATH="$ROOT_DIR/backend/dist/DocMatrix.app"
DMG_DIR="$ROOT_DIR/backend/dist/dmg"
DMG_OUT="$ROOT_DIR/backend/dist/DocMatrix.dmg"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Creating DMG Installer${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .app exists
if [[ ! -d "$APP_PATH" ]]; then
  echo -e "${RED}Error: Application not found at: $APP_PATH${NC}"
  echo -e "${YELLOW}Run: ./scripts/build_app.sh${NC}"
  exit 1
fi

# Check if create-dmg is installed
if ! command -v create-dmg &> /dev/null; then
  echo -e "${RED}Error: create-dmg not found${NC}"
  echo -e "${YELLOW}Install with: brew install create-dmg${NC}"
  exit 1
fi

echo -e "${BLUE}[1/3]${NC} Preparing DMG staging directory..."
mkdir -p "$DMG_DIR"
rm -rf "$DMG_DIR"/*
cp -R "$APP_PATH" "$DMG_DIR/"

echo -e "${BLUE}[2/3]${NC} Creating DMG..."
rm -f "$DMG_OUT"

create-dmg \
  --volname "DocMatrix" \
  --window-size 600 400 \
  --icon-size 100 \
  --icon "DocMatrix.app" 150 200 \
  --app-drop-link 450 200 \
  "$DMG_OUT" \
  "$DMG_DIR" 2>&1 | grep -v "^hdiutil: " || true

echo -e "${BLUE}[3/3]${NC} Verifying DMG..."
if [ ! -f "$DMG_OUT" ]; then
  echo -e "${RED}Error: DMG creation failed${NC}"
  exit 1
fi

DMG_SIZE=$(du -h "$DMG_OUT" | cut -f1)

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  DMG Created Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  Location: ${BLUE}$DMG_OUT${NC}"
echo -e "  Size:     ${BLUE}$DMG_SIZE${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Test: open \"$DMG_OUT\""
echo -e "  2. Drag DocMatrix to Applications"
echo -e "  3. Distribute to users!"
echo ""
