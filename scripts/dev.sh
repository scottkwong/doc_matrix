#!/usr/bin/env bash
# Unified development script - starts backend and frontend with hot reload
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Initialize PID variables
BACKEND_PID=""
FRONTEND_PID=""
TAIL_PID=""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  DocMatrix Development Server${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    [[ -n "$BACKEND_PID" ]] && kill $BACKEND_PID 2>/dev/null || true
    [[ -n "$FRONTEND_PID" ]] && kill $FRONTEND_PID 2>/dev/null || true
    [[ -n "$TAIL_PID" ]] && kill $TAIL_PID 2>/dev/null || true
    [[ -n "$BACKEND_PID" ]] && wait $BACKEND_PID 2>/dev/null || true
    [[ -n "$FRONTEND_PID" ]] && wait $FRONTEND_PID 2>/dev/null || true
    [[ -n "$TAIL_PID" ]] && wait $TAIL_PID 2>/dev/null || true
    echo -e "${GREEN}Servers stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Setup backend
echo -e "${BLUE}[Backend]${NC} Setting up Python environment..."
cd "$BACKEND_DIR"

if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}[Backend]${NC} Creating virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

echo -e "${BLUE}[Backend]${NC} Installing dependencies..."
pip install --upgrade pip -q
pip install -r requirements.txt -q
if [ -f requirements-dev.txt ]; then
    pip install -r requirements-dev.txt -q
fi

# Setup frontend
echo -e "${BLUE}[Frontend]${NC} Installing dependencies..."
cd "$FRONTEND_DIR"
npm install --silent

echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""

# Start backend
echo -e "${BLUE}[Backend]${NC} Starting Flask server on http://127.0.0.1:5001"
cd "$BACKEND_DIR"
FLASK_RUN_PORT=5001 python -c "
from app.api import create_api_routes
from app.state import AppState
from app.logging_config import setup_logging
from localwebapp.server import create_flask_app
from pathlib import Path
import logging

# Initialize logging first
setup_logging(log_level='INFO')
logger = logging.getLogger(__name__)
logger.info('🚀 Doc Matrix development server starting...')

# Create app with new modular structure
state = AppState.load(default_root=Path.home())
logger.info(f'📁 Current root: {state.root}')
api_blueprint = create_api_routes(state)
static_root = Path('../frontend/dist').resolve()
app = create_flask_app(static_root, api_blueprint)
logger.info('✅ Flask app initialized')
app.run(host='127.0.0.1', port=5001, debug=True)
" > /tmp/docmatrix_backend.log 2>&1 &
BACKEND_PID=$!

sleep 2

# Start frontend
echo -e "${BLUE}[Frontend]${NC} Starting Vite dev server on http://127.0.0.1:5173"
cd "$FRONTEND_DIR"
npm run dev > /tmp/docmatrix_frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 2

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Development servers are running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  ${BLUE}Frontend:${NC} http://127.0.0.1:5173"
echo -e "  ${BLUE}Backend:${NC}  http://127.0.0.1:5001"
echo ""
echo -e "  ${YELLOW}Logs:${NC}"
echo -e "    Backend:  tail -f /tmp/docmatrix_backend.log"
echo -e "    Frontend: tail -f /tmp/docmatrix_frontend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Backend Logs (live)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Tail backend logs and wait for processes
tail -f /tmp/docmatrix_backend.log &
TAIL_PID=$!

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID


