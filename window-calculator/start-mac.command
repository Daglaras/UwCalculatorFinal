#!/bin/bash

# ========================================
#   Profilco U-Value Calculator
# ========================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "   Profilco U-Value Calculator"
echo "========================================"
echo ""

# Get the directory where this script is located
cd "$(dirname "$0")"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR] Python 3 is not installed!${NC}"
    echo ""
    echo "Please install Python using one of these methods:"
    echo "  1. Download from: https://www.python.org/downloads/"
    echo "  2. Using Homebrew: brew install python"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed!${NC}"
    echo ""
    echo "Please install Node.js using one of these methods:"
    echo "  1. Download from: https://nodejs.org/"
    echo "  2. Using Homebrew: brew install node"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if this is first run (no node_modules)
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[1/3] First run - Installing dependencies...${NC}"
    echo "       This may take a few minutes..."
    echo ""
    
    echo "Installing Python packages..."
    pip3 install -r requirements.txt --quiet --break-system-packages 2>/dev/null || pip3 install -r requirements.txt --quiet
    
    echo "Installing Node.js packages..."
    npm install --silent
    
    echo ""
    echo -e "${GREEN}[OK] Dependencies installed!${NC}"
    echo ""
else
    echo -e "${GREEN}[OK] Dependencies already installed.${NC}"
    echo ""
fi

# Kill any existing processes on our ports
echo "[2/3] Preparing to start servers..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start backend server in background
echo "[3/3] Starting servers..."
echo ""
python3 -m uvicorn backend:app --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
echo "       Waiting for backend to start..."
sleep 3

# Start frontend server in background
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "       Waiting for frontend to start..."
sleep 5

# Open browser
echo ""
echo "========================================"
echo -e "${GREEN}   App is running!${NC}"
echo "========================================"
echo ""
echo "   Opening browser to: http://localhost:3000"
echo ""
echo "   To stop the app, press Ctrl+C or close this window."
echo "========================================"
echo ""

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000
else
    xdg-open http://localhost:3000 2>/dev/null || echo "Please open http://localhost:3000 in your browser"
fi

# Cleanup function
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    echo "Done!"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Keep script running
wait
