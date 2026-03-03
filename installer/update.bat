@echo off
setlocal

set BASE=C:\VZArcade
set BRIDGE_DIR=%BASE%\bridge
set TMP_ZIP=%TEMP%\vzlauncher-bridge.zip
set RELEASE_URL=https://github.com/Ledmetal94/VZLAUNCHER/releases/latest/download/bridge.zip

echo ============================================
echo   VZLAUNCHER - Aggiornamento Bridge
echo ============================================
echo.

:: --- Verifica privilegi amministratore ---
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRORE] Esegui come Amministratore.
    pause
    exit /b 1
)

:: --- Ferma il bridge se in esecuzione ---
echo [1/4] Arresto bridge in esecuzione...
taskkill /FI "WINDOWTITLE eq VZLAUNCHER Bridge" /F >nul 2>&1
timeout /t 2 /nobreak >nul

:: --- Scarica ultima versione ---
echo [2/4] Download ultima versione da GitHub...
curl -L --progress-bar "%RELEASE_URL%" -o "%TMP_ZIP%"
if %errorLevel% neq 0 (
    echo [ERRORE] Download fallito. Verifica la connessione internet.
    pause
    exit /b 1
)

:: --- Estrai in C:\VZArcade\ (il zip contiene bridge/ come cartella root) ---
:: Preserva config/games.json e data/ che sono specifici della macchina
echo [3/4] Estrazione file...
tar -xf "%TMP_ZIP%" -C "%BASE%" --exclude="bridge/config/games.json" --exclude="bridge/config/games.local.json" --exclude="bridge/data/*"
if %errorLevel% neq 0 (
    echo [ERRORE] Estrazione fallita.
    pause
    exit /b 1
)
del "%TMP_ZIP%"

:: --- Reinstalla dipendenze npm ---
echo [4/4] Aggiornamento dipendenze npm...
pushd "%BRIDGE_DIR%"
"%BASE%\node\node.exe" "%BASE%\node\node_modules\npm\bin\npm-cli.js" install --omit=dev >nul 2>&1
popd

echo.
echo ============================================
echo   Aggiornamento completato!
echo   Riavvia VZLAUNCHER con lo shortcut desktop.
echo ============================================
echo.
pause
endlocal
