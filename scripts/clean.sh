#!/usr/bin/env bash
set -euo pipefail

# Clean build artifacts and development files
#
# Usage:
#   ./scripts/clean.sh [options]
#
# Options:
#   --all        Also remove venv and node_modules (full clean)
#   --deps       Only remove venv and node_modules
#   -h, --help   Show this help message

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLEAN_DEPS=false
CLEAN_BUILD=true

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --all)
      CLEAN_DEPS=true
      CLEAN_BUILD=true
      shift
      ;;
    --deps)
      CLEAN_DEPS=true
      CLEAN_BUILD=false
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --all        Remove everything (build + dependencies)"
      echo "  --deps       Remove only venv and node_modules"
      echo "  -h, --help   Show this help"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Cleaning Project${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$CLEAN_BUILD" = true ]; then
    echo -e "${YELLOW}Removing build artifacts...${NC}"
    
    # Backend build artifacts
    rm -rf "$ROOT_DIR/backend/build"
    rm -rf "$ROOT_DIR/backend/dist"
    rm -rf "$ROOT_DIR/backend/frontend_dist"
    rm -f "$ROOT_DIR/backend"/*.spec
    
    # Frontend build artifacts
    rm -rf "$ROOT_DIR/frontend/dist"
    
    # Python cache
    find "$ROOT_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find "$ROOT_DIR" -type f -name "*.pyc" -delete 2>/dev/null || true
    find "$ROOT_DIR" -type f -name "*.pyo" -delete 2>/dev/null || true
    
    # Log files
    rm -f /tmp/docmatrix_*.log
    
    # IDE artifacts
    rm -rf "$ROOT_DIR/.vscode/chrome-debug-profile"
    rm -rf "$ROOT_DIR/.vscode/edge-debug-profile"
    
    echo -e "${GREEN}✓${NC} Build artifacts removed"
fi

if [ "$CLEAN_DEPS" = true ]; then
    echo -e "${YELLOW}Removing dependencies...${NC}"
    
    # Python virtual environment
    rm -rf "$ROOT_DIR/backend/.venv"
    
    # Node modules
    rm -rf "$ROOT_DIR/frontend/node_modules"
    rm -f "$ROOT_DIR/frontend/package-lock.json"
    
    echo -e "${GREEN}✓${NC} Dependencies removed"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Clean Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

if [ "$CLEAN_DEPS" = true ]; then
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "  Run ./scripts/dev.sh to reinstall dependencies"
    echo ""
fi

