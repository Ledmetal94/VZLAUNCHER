# VZLAUNCHER

Arcade game launcher for VZ Italia — built with React 19, TypeScript, Vite, Tailwind v4, and shadcn/ui.

## Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui (New York)
- **State**: Zustand + persist
- **Routing**: React Router v7
- **Bridge**: Express server (`localhost:3001`) — launches HeroZone / VEX Play via automation
- **PWA**: vite-plugin-pwa

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

Or use the included `start.bat` to launch everything at once.

## Video Assets (not in repo)

Game promo videos are **not committed to git** due to file size. After cloning, manually copy the following folders from the shared drive or the arcade PC:

- `GameVideos/` — source trailer files
- `public/assets/games/*/promo.mp4` — in-app promo clips per game

The app works without them but video previews will be missing.

## Project Structure

```
src/
  components/
    catalog/     # TopBar, CatalogGameCard, BottomBar
    game/        # GameCard, QuickStartCard
    layout/      # SideNav, Layout
    ui/          # shadcn components
  pages/         # CatalogPage, GameDetailPage, LoginPage, etc.
  store/         # Zustand stores (auth, config, session)
  services/      # bridge.ts (health check + game launch)
  data/          # games.ts, tutorials.ts
bridge/
  server.js      # Express bridge server
  config/
    games.json   # Per-game launcher config (exePath, steps)
public/
  assets/
    brand/       # VZ logos
    games/       # Per-game posters and logos
```
