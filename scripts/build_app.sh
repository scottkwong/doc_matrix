#!/usr/bin/env bash
set -euo pipefail

# Build a macOS .app using PyInstaller.
# Assumes: Python 3.10+, Node 18+.
#
# Usage:
#   ./scripts/build_app.sh [options]
#
# Options:
#   --skip-frontend    Skip frontend rebuild (faster iteration)
#   --version VERSION  Set version number (updates config files)
#   -h, --help        Show this help message

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SKIP_FRONTEND=false
VERSION=""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-frontend)
      SKIP_FRONTEND=true
      shift
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --skip-frontend    Skip frontend rebuild (faster iteration)"
      echo "  --version VERSION  Set version number"
      echo "  -h, --help        Show this help"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Building macOS Application${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 not found${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: node not found${NC}"
    exit 1
fi

# Build frontend
if [ "$SKIP_FRONTEND" = false ]; then
    echo -e "${BLUE}[1/6]${NC} Building frontend..."
    cd "$ROOT_DIR/frontend"
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}  Installing npm dependencies...${NC}"
        npm install
    fi
    
    npm run build
    
    echo -e "${BLUE}[2/6]${NC} Copying frontend build to backend..."
    rm -rf "$ROOT_DIR/backend/frontend_dist"
    cp -R "$ROOT_DIR/frontend/dist" "$ROOT_DIR/backend/frontend_dist"
else
    echo -e "${YELLOW}[1/6]${NC} Skipping frontend build"
    echo -e "${YELLOW}[2/6]${NC} Using existing frontend_dist"
    
    if [ ! -d "$ROOT_DIR/backend/frontend_dist" ]; then
        echo -e "${RED}Error: backend/frontend_dist not found. Run without --skip-frontend first.${NC}"
        exit 1
    fi
fi

# Setup Python environment
echo -e "${BLUE}[3/6]${NC} Setting up Python environment..."
cd "$ROOT_DIR/backend"

if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}  Creating virtual environment...${NC}"
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q

# Build icon
echo -e "${BLUE}[4/6]${NC} Building application icon..."
rm -rf build/icon.iconset build/icon.icns
"$ROOT_DIR/scripts/make_icns.sh" > /dev/null

if [ ! -f "build/icon.icns" ]; then
    echo -e "${RED}Error: Failed to build icon${NC}"
    exit 1
fi

# PyInstaller build
echo -e "${BLUE}[5/6]${NC} Running PyInstaller..."
rm -rf build/DocMatrix dist/DocMatrix dist/DocMatrix.app

pyinstaller \
    --noconfirm \
    --onedir \
    --windowed \
    --name DocMatrix \
    --icon "build/icon.icns" \
    --add-data "frontend_dist:frontend_dist" \
    main.py

# Verify build
echo -e "${BLUE}[6/6]${NC} Verifying build..."
APP_PATH="$ROOT_DIR/backend/dist/DocMatrix.app"

if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}Error: Build failed - .app not found${NC}"
    exit 1
fi

# Success!
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Build Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  Location: ${BLUE}$APP_PATH${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Test: open \"$APP_PATH\""
echo -e "  2. Create DMG: ./scripts/make_dmg.sh"
echo ""
