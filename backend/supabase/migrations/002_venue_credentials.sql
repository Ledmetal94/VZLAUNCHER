-- ============================================================
-- VZLAUNCHER — Venue credentials
-- Adds username + password_hash to venues for venue-level login
-- ============================================================

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS username      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ─── Dev seed: set credentials for "Virtual Zone Roma" ────────────────────────
-- username: vzroma | password: vzroma2026
DO $$
BEGIN
  UPDATE venues
  SET
    username      = 'vzroma',
    password_hash = '$2b$10$Xt0HmAZKr44El22U2QT2OOjQ.dvIuQdHpEMYrbao.7GetNDEmlS4K'
    -- ^ bcrypt hash of 'vzroma2026' (cost 10)
  WHERE name = 'Virtual Zone Roma';
END $$;
