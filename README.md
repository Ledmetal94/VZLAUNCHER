# VZLAUNCHER

Arcade game launcher for VZ Italia — built with React 19, TypeScript, Vite, Tailwind v4, and shadcn/ui.

## Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui (New York)
- **State**: Zustand + persist
- **Routing**: React Router v7
- **Bridge**: Express server (`localhost:3001`) — launches HeroZone / VEX Play via automation
- **Backend**: Express + Supabase (PostgreSQL) + JWT — porta 3002
- **PWA**: vite-plugin-pwa
- **Deploy**: Vercel (frontend + API serverless)

## Getting Started

```bash
npm install
npm run dev
```

To also run the bridge server:

```bash
cd bridge
npm install
node server.js
```

To run the cloud backend locally:

```bash
cd backend
npm install
npm run dev
```

## Project Structure

```
src/
  components/
    catalog/     # TopBar, CatalogGameCard, BottomBar
    game/        # GameCard, QuickStartCard
    layout/      # SideNav, Layout, UpdateBanner
    auth/        # RequireVenue (esporta RequireAuth + RequireAdmin)
    analytics/   # TimeSeriesChart, GamePopularityChart, OperatorStatsTable
    settings/    # SettingsPanel
    ui/          # shadcn components
  pages/         # CatalogPage, GameDetailPage, LoginPage, AnalyticsPage, etc.
  store/         # Zustand stores (auth, config, session)
  services/      # bridge.ts, cloudApi.ts
  data/          # games.ts, tutorials.ts
bridge/
  server.js      # Express bridge server :3001
  config/
    games.json   # Per-game launcher config (exePath, steps)
backend/
  src/           # Express API server :3002
  supabase/
    migrations/  # SQL migrations (001–003)
installer/
  vzlauncher.iss       # Inno Setup script — compila vzlauncher-setup.exe
  start-vzlauncher.bat # Avvia bridge + Chrome kiosk
  update.bat           # Aggiorna bridge da GitHub Releases
```

## Auth

Unico login username + password → JWT con ruolo (`admin` | `normal`).

Credenziali di default (seed DB):
- `vzadmin` / `vzadmin2026` — admin
- `vzstaff` / `vzstaff2026` — operatore normale

## Video Assets (not in repo)

Game promo videos are **not committed to git** due to file size. After cloning, manually copy:

- `public/assets/games/*/promo.mp4` — in-app promo clips per game

The app works without them but video previews will be missing.

---

## Windows Installer (`vzlauncher-setup.exe`)

L'installer è compilato con **Inno Setup** (`installer/vzlauncher.iss`).

### Pre-requisiti prima di compilare

1. Node.js portable: scarica `node-v20.x.x-win-x64.zip` da nodejs.org, estrailo e rinominalo `node/` dentro `installer/`
2. HeroZone: estrai l'Electron app in `installer/herozone/`
3. Bridge `node_modules`: esegui `npm install --omit=dev` dentro `bridge/` prima di compilare (l'`.iss` include la cartella)

### Bug noti e soluzioni

#### 1. `tar --overwrite` non supportato su Windows
Windows usa `bsdtar` che non riconosce `--overwrite`. Rimuovere il flag — bsdtar sovrascrive di default.

#### 2. Path di estrazione ZIP errato in `update.bat`
Il file `bridge.zip` pubblicato da GitHub Actions contiene `bridge/` come cartella root. Va estratto in `C:\VZArcade\` (non in `C:\VZArcade\bridge\`), altrimenti i file finiscono in `C:\VZArcade\bridge\bridge\`.

```bat
tar -xf "%TMP_ZIP%" -C "%BASE%" --exclude="bridge/config/games.json" ...
```

#### 3. GitHub Releases non scaricabile da repo privato
`curl` senza autenticazione scarica HTML invece dello ZIP. Soluzioni:
- Rendere il repo pubblico (scelta attuale)
- Oppure usare un PAT con `secret.RELEASES_PAT` nel workflow e `Authorization: token` nell'header curl

#### 4. Shortcut `.bat` non affidabile su Windows
Non usare il `.bat` direttamente come `Filename` nello shortcut. Usare `cmd.exe` come target:

```ini
Filename: "cmd.exe"
Parameters: "/c ""{app}\start-vzlauncher.bat"""
```

#### 5. Virgolette nella variabile `CHROME` rompono i confronti
Non includere virgolette nel valore della variabile. Usare `if not defined CHROME` invece di `if "%CHROME%"==""`. Aggiungere le virgolette solo al momento dell'uso:

```bat
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe
if not defined CHROME (echo errore)
start "" "%CHROME%" --app=...
```

#### 6. GitHub Actions 403 su upload release
Aggiungere `permissions: contents: write` nel workflow YAML:

```yaml
permissions:
  contents: write
```

#### 7. Bridge bloccante nel `.bat`
Non chiamare `node server.js` direttamente — blocca il terminale. Usare `start /min`:

```bat
start /min "VZLAUNCHER Bridge" "%NODE%" "%BRIDGE%"
```

#### 8. Parentesi in path `Program Files (x86)` rompono blocchi `if`
Le parentesi in `Program Files (x86)` vengono interpretate come delimitatori di blocco `if` anche dentro stringhe quotate. Usare assegnazione su singola riga:

```bat
:: SBAGLIATO
if exist "C:\Program Files (x86)\..." (
    set CHROME=...
)

:: CORRETTO
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
```
