@echo off
setlocal

set BASE=C:\VZArcade
set NODE=%BASE%\node\node.exe
set BRIDGE=%BASE%\bridge\server.js
set APP_URL=https://vzlauncher.vercel.app/

:: Trova Chrome (posizioni standard)
set CHROME=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
if "%CHROME%"=="" (
    echo [ERRORE] Google Chrome non trovato.
    pause
    exit /b 1
)

:: --- Avvia bridge in background se non già in esecuzione ---
netstat -ano | findstr ":3001" >nul 2>&1
if %errorLevel% neq 0 (
    echo Avvio bridge...
    start /min "VZLAUNCHER Bridge" "%NODE%" "%BRIDGE%"
)

:: --- Attendi che il bridge sia up (max 15 tentativi) ---
for /L %%i in (1,1,15) do (
    timeout /t 1 /nobreak >nul
    curl -s http://localhost:3001/health >nul 2>&1 && goto :bridge_ready
)
echo [ERRORE] Bridge non risponde dopo 15s. Controlla C:\VZArcade\bridge\
pause
exit /b 1

:bridge_ready
:: --- Apri Chrome in kiosk fullscreen ---
start "" %CHROME% --app=%APP_URL% --start-fullscreen --no-default-browser-check --disable-infobars

endlocal
