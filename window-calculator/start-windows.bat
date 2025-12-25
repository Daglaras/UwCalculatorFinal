@echo off
title Profilco U-Value Calculator
color 0A

echo ========================================
echo   Profilco U-Value Calculator
echo ========================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed!
    echo.
    echo Please download and install Python from:
    echo https://www.python.org/downloads/
    echo.
    echo IMPORTANT: Check "Add Python to PATH" during installation!
    echo.
    pause
    exit /b 1
)

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Get the directory where this script is located
cd /d "%~dp0"

:: Check if this is first run (no node_modules)
if not exist "node_modules" (
    echo [1/3] First run - Installing dependencies...
    echo       This may take a few minutes...
    echo.
    
    echo Installing Python packages...
    pip install -r requirements.txt --quiet
    
    echo Installing Node.js packages...
    call npm install --silent
    
    echo.
    echo [OK] Dependencies installed!
    echo.
) else (
    echo [OK] Dependencies already installed.
    echo.
)

:: Kill any existing processes on our ports
echo [2/3] Preparing to start servers...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Start backend server in background
echo [3/3] Starting servers...
echo.
start /B cmd /c "python -m uvicorn backend:app --port 8000 2>nul"

:: Wait for backend to start
echo       Waiting for backend to start...
timeout /t 3 /nobreak >nul

:: Start frontend server in background
start /B cmd /c "npm run dev 2>nul"

:: Wait for frontend to start
echo       Waiting for frontend to start...
timeout /t 5 /nobreak >nul

:: Open browser
echo.
echo ========================================
echo   App is running!
echo ========================================
echo.
echo   Opening browser to: http://localhost:3000
echo.
echo   To stop the app, close this window.
echo ========================================
echo.

start http://localhost:3000

:: Keep the window open
echo Press any key to STOP the servers and exit...
pause >nul

:: Cleanup - kill the servers
echo.
echo Stopping servers...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Done!
exit /b 0
