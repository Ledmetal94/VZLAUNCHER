@echo off
setlocal EnableDelayedExpansion

set BASE=C:\VZArcade
set NODE=%BASE%\node\node.exe
set BRIDGE=%BASE%\bridge\server.js
set APP_URL=https://vzlauncher.vercel.app/
set LOG=%BASE%\launcher.log

echo [%date% %time%] Avvio VZLAUNCHER >> "%LOG%"

:: --- Verifica file essenziali ---
if not exist "%NODE%" (
    echo [ERRORE] Node.js non trovato: %NODE%
    echo [%date% %time%] ERRORE: Node.js non trovato >> "%LOG%"
    pause
    exit /b 1
)
if not exist "%BRIDGE%" (
    echo [ERRORE] Bridge non trovato: %BRIDGE%
    echo [%date% %time%] ERRORE: Bridge non trovato >> "%LOG%"
    pause
    exit /b 1
)

:: --- Trova Chrome (singola riga per evitare problemi con parentesi nei path) ---
set CHROME=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
if not defined CHROME (
    echo [ERRORE] Google Chrome non trovato.
    echo [%date% %time%] ERRORE: Chrome non trovato >> "%LOG%"
    pause
    exit /b 1
)
echo [%date% %time%] Chrome trovato >> "%LOG%"

:: --- Avvia bridge in background se non gia' in esecuzione ---
netstat -ano | findstr ":3001" >nul 2>&1
if %errorLevel% neq 0 (
    echo Avvio bridge...
    echo [%date% %time%] Avvio bridge... >> "%LOG%"
    start /min "VZLAUNCHER Bridge" "%NODE%" "%BRIDGE%"
)

:: --- Attendi che il bridge sia up (max 15 tentativi) ---
echo Attendo bridge su localhost:3001...
for /L %%i in (1,1,15) do (
    timeout /t 1 /nobreak >nul
    curl -s http://localhost:3001/health >nul 2>&1
    if !errorLevel! == 0 goto :bridge_ready
)
echo [ERRORE] Bridge non risponde dopo 15s.
echo [%date% %time%] ERRORE: Bridge timeout >> "%LOG%"
echo Controlla: %BRIDGE%
pause
exit /b 1

:bridge_ready
echo [%date% %time%] Bridge OK - apro Chrome >> "%LOG%"
start "" "%CHROME%" --app=%APP_URL% --start-fullscreen --no-default-browser-check --disable-infobars

endlocal
