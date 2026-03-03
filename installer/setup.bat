@echo off
setlocal EnableDelayedExpansion

echo ============================================
echo   VZLAUNCHER - Setup Installazione PC
echo ============================================
echo.

:: --- Richiede privilegi amministratore ---
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRORE] Esegui questo script come Amministratore.
    echo Clicca destro su setup.bat ^> "Esegui come amministratore"
    pause
    exit /b 1
)

:: --- Verifica Node.js ---
echo [1/5] Verifica Node.js...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRORE] Node.js non trovato. Scaricalo da https://nodejs.org e riprova.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo        Node.js %%v trovato.

:: --- Crea struttura cartelle C:\VZArcade\ ---
echo.
echo [2/5] Creazione struttura C:\VZArcade\...
set BASE=C:\VZArcade

for %%d in (
    "%BASE%"
    "%BASE%\herozone"
    "%BASE%\vexplay"
    "%BASE%\media"
    "%BASE%\media\videos"
    "%BASE%\media\images"
    "%BASE%\bridge"
) do (
    if not exist %%d (
        mkdir %%d
        echo        Creata: %%d
    ) else (
        echo        Gia' esistente: %%d
    )
)

:: --- Copia file dal supporto di installazione ---
echo.
echo [3/5] Copia file...

set SCRIPT_DIR=%~dp0

:: HeroZone
if exist "%SCRIPT_DIR%herozone\" (
    xcopy /E /I /Y "%SCRIPT_DIR%herozone\*" "%BASE%\herozone\" >nul
    echo        HeroZone copiato.
) else (
    echo [ATTENZIONE] Cartella herozone\ non trovata vicino a setup.bat. Copia manualmente in C:\VZArcade\herozone\
)

:: VEX Play
if exist "%SCRIPT_DIR%vexplay\" (
    xcopy /E /I /Y "%SCRIPT_DIR%vexplay\*" "%BASE%\vexplay\" >nul
    echo        VEX Play copiato.
) else (
    echo [ATTENZIONE] Cartella vexplay\ non trovata vicino a setup.bat. Copia manualmente in C:\VZArcade\vexplay\
)

:: Media
if exist "%SCRIPT_DIR%media\" (
    xcopy /E /I /Y "%SCRIPT_DIR%media\*" "%BASE%\media\" >nul
    echo        Media copiati.
) else (
    echo [ATTENZIONE] Cartella media\ non trovata vicino a setup.bat.
)

:: Bridge
if exist "%SCRIPT_DIR%..\bridge\" (
    xcopy /E /I /Y "%SCRIPT_DIR%..\bridge\*" "%BASE%\bridge\" >nul
    echo        Bridge server copiato.
) else (
    echo [ATTENZIONE] Cartella bridge\ non trovata. Copia manualmente in C:\VZArcade\bridge\
)

:: --- Installa dipendenze Node del bridge ---
echo.
echo [4/5] Installazione dipendenze bridge (npm install)...
if exist "%BASE%\bridge\package.json" (
    pushd "%BASE%\bridge"
    call npm install --omit=dev >nul 2>&1
    popd
    echo        Dipendenze installate.
) else (
    echo [ATTENZIONE] package.json non trovato in C:\VZArcade\bridge\. Salta npm install.
)

:: --- Crea shortcut avvio bridge sul Desktop ---
echo.
echo [5/5] Creazione shortcut "Avvia VZLAUNCHER Bridge" sul Desktop...
set SHORTCUT=%PUBLIC%\Desktop\Avvia VZLAUNCHER Bridge.lnk
set TARGET=cmd.exe
set ARGS=/k "cd /d C:\VZArcade\bridge && node server.js"
set ICON=%BASE%\bridge\icon.ico

powershell -Command ^
  "$s = (New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT%');" ^
  "$s.TargetPath = 'cmd.exe';" ^
  "$s.Arguments = '/k \"cd /d C:\VZArcade\bridge && node server.js\"';" ^
  "$s.WorkingDirectory = 'C:\VZArcade\bridge';" ^
  "$s.WindowStyle = 1;" ^
  "$s.Description = 'Avvia VZLAUNCHER Bridge Server';" ^
  "$s.Save()"

if exist "%SHORTCUT%" (
    echo        Shortcut creato sul Desktop pubblico.
) else (
    echo [ATTENZIONE] Shortcut non creato. Avvia manualmente: cd C:\VZArcade\bridge ^&^& node server.js
)

:: --- Fine ---
echo.
echo ============================================
echo   Setup completato!
echo.
echo   Prossimi passi:
echo   1. Verifica che i launcher siano in:
echo      C:\VZArcade\herozone\Hero Launcher.exe
echo      C:\VZArcade\vexplay\VEX Play.exe
echo   2. Avvia il bridge con lo shortcut sul Desktop
echo   3. Apri VZLAUNCHER nel browser (localhost:5173)
echo ============================================
echo.
pause
endlocal
