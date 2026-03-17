@echo off
title VZLAUNCHER Bridge
color 0A
cd /d "%~dp0"
echo.
echo  VZLAUNCHER Bridge starting...
echo  Press Ctrl+C to stop
echo.
node server.js
pause
