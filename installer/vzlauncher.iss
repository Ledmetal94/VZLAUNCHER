#define AppName "VZLAUNCHER"
#define AppVersion "1.0.3"
#define AppPublisher "Virtual Zone"
#define AppURL "https://vzlauncher.vercel.app/"
#define InstallDir "C:\VZArcade"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
DefaultDirName={#InstallDir}
DisableDirPage=yes
DisableProgramGroupPage=yes
OutputDir=output
OutputBaseFilename=vzlauncher-setup
SetupIconFile=assets\icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
; Mostra solo una pagina di benvenuto + progresso
DisableWelcomePage=no
DisableReadyPage=yes

[Languages]
Name: "italian"; MessagesFile: "compiler:Languages\Italian.isl"

[Messages]
WelcomeLabel1=Benvenuto nel setup di VZLAUNCHER
WelcomeLabel2=Questo installer configurerà VZLAUNCHER Arcade sul tuo PC.%n%nVerrà installato in C:\VZArcade\ e verrà creato uno shortcut sul Desktop.%n%nFai clic su Avanti per continuare.

[Files]
; --- Node.js portable ---
; Scarica da https://nodejs.org/dist/v20.x.x/node-v20.x.x-win-x64.zip
; Estrai e rinomina la cartella in "node", mettila in installer/
Source: "node\*"; DestDir: "{app}\node"; Flags: recursesubdirs createallsubdirs

; --- Bridge server ---
Source: "..\bridge\server.js"; DestDir: "{app}\bridge"
Source: "..\bridge\package.json"; DestDir: "{app}\bridge"
Source: "..\bridge\launchers\*"; DestDir: "{app}\bridge\launchers"; Flags: recursesubdirs
Source: "..\bridge\utils\*"; DestDir: "{app}\bridge\utils"; Flags: recursesubdirs
Source: "..\bridge\automation\*"; DestDir: "{app}\bridge\automation"; Flags: recursesubdirs
Source: "..\bridge\config\games.json"; DestDir: "{app}\bridge\config"
Source: "..\bridge\node_modules\*"; DestDir: "{app}\bridge\node_modules"; Flags: recursesubdirs createallsubdirs

; --- Giochi ---
; Copia herozone estratto in installer/herozone/ prima di compilare
Source: "herozone\*"; DestDir: "{app}\herozone"; Flags: recursesubdirs createallsubdirs
; Decommenta quando hai VEX Play:
; Source: "vexplay\*"; DestDir: "{app}\vexplay"; Flags: recursesubdirs createallsubdirs

; --- Media ---
; Source: "media\*"; DestDir: "{app}\media"; Flags: recursesubdirs createallsubdirs

; --- Script di avvio e aggiornamento ---
Source: "start-vzlauncher.bat"; DestDir: "{app}"
Source: "update.bat"; DestDir: "{app}"

[Dirs]
; Cartella data scrivibile per sessioni locali
Name: "{app}\bridge\data"

[Icons]
; Shortcut Desktop pubblico (tutti gli utenti)
; Usa cmd.exe /c per eseguire il bat in modo affidabile
Name: "{commondesktop}\VZLAUNCHER Arcade"; \
  Filename: "cmd.exe"; \
  Parameters: "/c ""{app}\start-vzlauncher.bat"""; \
  WorkingDir: "{app}"; \
  IconFilename: "{app}\bridge\icon.ico"; \
  Comment: "Avvia VZLAUNCHER Arcade"

; Shortcut aggiornamento nel menu Start
Name: "{commonstartmenu}\VZLAUNCHER\Aggiorna Bridge"; \
  Filename: "cmd.exe"; \
  Parameters: "/k ""{app}\update.bat"""; \
  WorkingDir: "{app}"; \
  Comment: "Aggiorna il bridge all'ultima versione"

[Run]
; Avvia VZLAUNCHER subito dopo l'installazione (opzionale)
Filename: "{app}\start-vzlauncher.bat"; \
  Description: "Avvia VZLAUNCHER Arcade adesso"; \
  Flags: postinstall nowait skipifsilent

[Code]
// Verifica che Chrome sia installato prima di procedere
function InitializeSetup(): Boolean;
var
  ChromePath: String;
begin
  ChromePath := 'C:\Program Files\Google\Chrome\Application\chrome.exe';
  if not FileExists(ChromePath) then
  begin
    MsgBox(
      'Google Chrome non trovato in:' + #13#10 + ChromePath + #13#10#13#10 +
      'Installa Chrome prima di continuare.',
      mbError, MB_OK
    );
    Result := False;
  end
  else
    Result := True;
end;
