# Game Assets

Each subfolder matches a `game_id` from `config/games.json`.

```
games/
├── hz-dead-ahead/
│   ├── poster.png          ← game card image (16:9 or square)
│   ├── clicks.json         ← saved click coordinates for automation
│   └── screenshots/        ← reference images for image matching (optional)
│       ├── play_button.png
│       └── start_game.png
├── hz-singularity/
│   ├── poster.png
│   └── clicks.json
└── ...
```

## poster.png
Used as the game card thumbnail in the frontend catalog.

## clicks.json
Saved coordinates from the coord-finder tool. Example:

```json
{
  "description": "Dead Ahead launch sequence",
  "resolution": "1920x1080",
  "clicks": [
    { "x": 960, "y": 540, "label": "click_play" },
    { "x": 960, "y": 700, "label": "click_start" }
  ]
}
```

## How to capture
```bash
cd bridge
npm run coords -- --output games/hz-dead-ahead/clicks.json
```
