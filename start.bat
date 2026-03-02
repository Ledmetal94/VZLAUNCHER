@echo off
setlocal
set "DIR=%~dp0"

echo  VZLAUNCHER Starting...
echo.

REM --- Bridge (port 3001) ---
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [bridge] Already running on :3001
) else (
    echo [bridge] Starting...
    start /min "VZLAUNCHER Bridge" cmd /c "cd /d "%DIR%bridge" && node server.js"
)

REM --- Dev server (port 5173) ---
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [vite]   Already running on :5173
) else (
    echo [vite]   Starting...
    start /min "VZLAUNCHER Dev" cmd /c "cd /d "%DIR%" && npx vite"
    timeout /t 3 /nobreak >nul
)

REM --- Open PWA in Chrome standalone window ---
echo [app]    Opening launcher...
start chrome --app=http://localhost:5173

exit
