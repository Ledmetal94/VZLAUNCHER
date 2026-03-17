@echo off
title VZLAUNCHER Bridge Setup
color 0B
echo.
echo  ========================================
echo   VZLAUNCHER Bridge - Setup
echo  ========================================
echo.

:: Check Node.js
echo [1/4] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js not found!
    echo  Download from: https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo  Found Node.js %%v

:: Check Python
echo.
echo [2/4] Checking Python...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo  WARNING: Python not found - automation features will be limited
    echo  Download from: https://python.org
    echo.
    set SKIP_PYTHON=1
) else (
    for /f "tokens=*" %%v in ('python --version') do echo  Found %%v
    set SKIP_PYTHON=0
)

:: Install Node dependencies
echo.
echo [3/4] Installing Node.js dependencies...
cd /d "%~dp0"
call npm install
if %errorlevel% neq 0 (
    echo  ERROR: npm install failed!
    pause
    exit /b 1
)
echo  Done.

:: Setup Python venv
echo.
echo [4/4] Setting up Python automation...
if "%SKIP_PYTHON%"=="1" (
    echo  Skipped - Python not available.
) else (
    if not exist "automation\python\.venv" (
        echo  Creating virtual environment...
        python -m venv automation\python\.venv
    ) else (
        echo  Virtual environment already exists.
    )
    echo  Installing Python packages...
    automation\python\.venv\Scripts\pip install -q -r automation\python\requirements.txt
    if %errorlevel% neq 0 (
        echo  WARNING: Python package install failed - automation will use fallback mode
    ) else (
        echo  Done.
    )
)

:: Verify
echo.
echo  ========================================
echo   Setup Complete!
echo  ========================================
echo.
echo  To start the bridge:
echo    Double-click  start.bat
echo    Or run:       npm start
echo.
echo  To test (no real games needed):
echo    Double-click  start-dev.bat
echo.
pause
