@echo off
title VZLAUNCHER Bridge (DEV)
color 0E
cd /d "%~dp0"
echo.
echo  VZLAUNCHER Bridge starting in DRY-RUN mode...
echo  (Uses test profiles - no real games needed)
echo  Press Ctrl+C to stop
echo.
set BRIDGE_DRY_RUN=true
node server.js
pause
