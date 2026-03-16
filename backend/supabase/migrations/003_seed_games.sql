-- Add bg column to game_configs
ALTER TABLE game_configs ADD COLUMN IF NOT EXISTS bg TEXT;

-- Seed: 18 games for Virtual Zone catalog
INSERT INTO game_configs (id, name, platform, category, min_players, max_players, duration_minutes, token_cost, description, thumbnail_url, badge, enabled, bg) VALUES
  (gen_random_uuid(), 'Dead Ahead',           'herozone', 'arcade_full',  1, 4, 15, 6,  '', '', 'HOT',  true, 'linear-gradient(145deg,#1a0505,#5a0000 50%,#2a0000)'),
  (gen_random_uuid(), 'Terminator Uprising',   'herozone', 'arcade_full',  1, 4, 15, 6,  '', '', 'NEW',  true, 'linear-gradient(145deg,#0a0a1a,#2a1040 50%,#1a0828)'),
  (gen_random_uuid(), 'Monkey Madness',        'herozone', 'arcade_light', 1, 4, 10, 4,  '', '', 'NEW',  true, 'linear-gradient(145deg,#0a2010,#1a4020 50%,#0a2010)'),
  (gen_random_uuid(), 'Arrowsong',             'herozone', 'avventura',    1, 4, 20, 7,  '', '', NULL,   true, 'linear-gradient(145deg,#1a1505,#3a2a10 50%,#1a1505)'),
  (gen_random_uuid(), 'Cyber Shock',           'vex',      'arcade_full',  1, 4, 15, 6,  '', '', NULL,   true, 'linear-gradient(145deg,#050520,#1a0540 50%,#0d0830)'),
  (gen_random_uuid(), 'Quantum Arena',         'vex',      'lasergame',    2, 6, 20, 8,  '', '', NULL,   true, 'linear-gradient(145deg,#000520,#002060 50%,#001040)'),
  (gen_random_uuid(), 'Wizard Academy',        'herozone', 'avventura',    1, 4, 20, 7,  '', '', NULL,   true, 'linear-gradient(145deg,#150a20,#2a1050 50%,#150a20)'),
  (gen_random_uuid(), 'Plush Rush',            'vex',      'arcade_light', 1, 4, 10, 4,  '', '', NULL,   true, 'linear-gradient(145deg,#201020,#402040 50%,#201020)'),
  (gen_random_uuid(), 'Cops vs Robbers',       'vex',      'lasergame',    2, 6, 20, 8,  '', '', NULL,   true, 'linear-gradient(145deg,#0a1020,#1a3050 50%,#0a1020)'),
  (gen_random_uuid(), 'Cook''d Up',            'herozone', 'arcade_light', 1, 4, 10, 4,  '', '', NULL,   true, 'linear-gradient(145deg,#1a1000,#3a2800 50%,#1a1000)'),
  (gen_random_uuid(), 'RE:COIL',               'vex',      'lasergame',    2, 6, 15, 7,  '', '', 'TOP',  true, 'linear-gradient(145deg,#001020,#003050 50%,#001020)'),
  (gen_random_uuid(), 'B Block Breakout',      'herozone', 'escape',       2, 4, 30, 10, '', '', NULL,   true, 'linear-gradient(145deg,#0a0520,#1a1040 50%,#0a0520)'),
  (gen_random_uuid(), 'Death Squad',           'herozone', 'arcade_full',  2, 6, 15, 7,  '', '', NULL,   true, 'linear-gradient(145deg,#100505,#3a0a0a 50%,#100505)'),
  (gen_random_uuid(), 'Temple Quest',          'herozone', 'avventura',    2, 6, 30, 10, '', '', NULL,   true, 'linear-gradient(145deg,#0a1505,#1a3010 50%,#0a1505)'),
  (gen_random_uuid(), 'Rush Z',                'herozone', 'arcade_full',  2, 6, 15, 7,  '', '', NULL,   true, 'linear-gradient(145deg,#1a0808,#4a1010 50%,#1a0808)'),
  (gen_random_uuid(), 'Arctic Olympics',       'vex',      'arcade_light', 2, 6, 10, 4,  '', '', NULL,   true, 'linear-gradient(145deg,#051520,#0a3050 50%,#051520)'),
  (gen_random_uuid(), 'Mission Z',             'herozone', 'avventura',    2, 4, 30, 10, '', '', NULL,   true, 'linear-gradient(145deg,#0a0a10,#1a2040 50%,#0a0a10)'),
  (gen_random_uuid(), 'Insanity',              'herozone', 'escape',       2, 6, 45, 12, '', '', 'NEW',  true, 'linear-gradient(145deg,#100510,#300a30 50%,#100510)');
