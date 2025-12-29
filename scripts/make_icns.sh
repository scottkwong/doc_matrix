#!/usr/bin/env bash
set -euo pipefail

# Creates backend/build/icon.icns from assets/icon.png
# Requires: macOS 'sips' and 'iconutil' (built-in)

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC_PNG="$ROOT_DIR/assets/icon.png"
OUT_DIR="$ROOT_DIR/backend/build"
ICONSET_DIR="$OUT_DIR/icon.iconset"
OUT_ICNS="$OUT_DIR/icon.icns"

mkdir -p "$OUT_DIR"
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

# Generate iconset sizes
for size in 16 32 64 128 256 512; do
  sips -z $size $size "$SRC_PNG" --out "$ICONSET_DIR/icon_${size}x${size}.png" >/dev/null
  sips -z $((size*2)) $((size*2)) "$SRC_PNG" --out "$ICONSET_DIR/icon_${size}x${size}@2x.png" >/dev/null
done

iconutil -c icns "$ICONSET_DIR" -o "$OUT_ICNS"
echo "Wrote: $OUT_ICNS"
