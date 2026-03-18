-- Per-venue game enable/disable junction table
CREATE TABLE IF NOT EXISTS venue_games (
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES game_configs(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (venue_id, game_id)
);

CREATE INDEX idx_venue_games_venue ON venue_games(venue_id);

-- Seed: enable all existing games for all existing venues
INSERT INTO venue_games (venue_id, game_id, enabled)
SELECT v.id, g.id, true
FROM venues v CROSS JOIN game_configs g
ON CONFLICT DO NOTHING;
