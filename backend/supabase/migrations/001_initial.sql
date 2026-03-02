-- ============================================================
-- VZLAUNCHER — Initial Schema
-- Run this in Supabase SQL Editor (or via Supabase CLI migrations)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Venues (arcade locations) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  city        TEXT,
  country     TEXT NOT NULL DEFAULT 'IT',
  timezone    TEXT NOT NULL DEFAULT 'Europe/Rome',
  currency    TEXT NOT NULL DEFAULT 'EUR',
  logo_url    TEXT,
  api_key     UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Operators (staff per venue) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operators (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  pin_hash    TEXT NOT NULL,           -- bcrypt hash, never returned in API
  role        TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('operator', 'admin')),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operators_venue ON operators(venue_id);
CREATE INDEX IF NOT EXISTS idx_operators_active ON operators(venue_id, active);

-- ─── Sessions (game sessions) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id                UUID PRIMARY KEY,            -- client-generated UUID (idempotent sync)
  venue_id          UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  operator_id       UUID NOT NULL REFERENCES operators(id),
  game_id           TEXT,
  game_slug         TEXT NOT NULL,
  game_name         TEXT NOT NULL,
  launcher          TEXT,                        -- 'herozone' | 'vexplay'
  difficulty        TEXT,                        -- 'easy' | 'normal' | 'hard' | 'nightmare'
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ,
  duration_seconds  INTEGER,
  price             NUMERIC(10, 2),
  notes             TEXT,
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_venue_time ON sessions(venue_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_game      ON sessions(venue_id, game_slug);
CREATE INDEX IF NOT EXISTS idx_sessions_operator  ON sessions(venue_id, operator_id);

-- ─── Game configs per venue ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  game_slug   TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  launcher    TEXT NOT NULL DEFAULT 'herozone',
  price       NUMERIC(10, 2),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, game_slug)
);

CREATE INDEX IF NOT EXISTS idx_game_configs_venue ON game_configs(venue_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- The API uses the service role key which bypasses RLS.
-- These policies protect direct client access (if ever needed).

ALTER TABLE venues      ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_configs ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically — no explicit policy needed for our API.
-- These deny-all policies protect against accidental direct client access.
CREATE POLICY "deny all direct access" ON venues      FOR ALL USING (false);
CREATE POLICY "deny all direct access" ON operators   FOR ALL USING (false);
CREATE POLICY "deny all direct access" ON sessions    FOR ALL USING (false);
CREATE POLICY "deny all direct access" ON game_configs FOR ALL USING (false);

-- ─── Dev seed ─────────────────────────────────────────────────────────────────
-- Creates a test venue with admin PIN 0000 and operator PIN 1234.
-- Remove or skip in production.
DO $$
DECLARE
  v_venue_id UUID;
BEGIN
  INSERT INTO venues (name, city, country, timezone, currency)
  VALUES ('Virtual Zone Roma', 'Roma', 'IT', 'Europe/Rome', 'EUR')
  RETURNING id INTO v_venue_id;

  -- Admin: PIN 0000
  INSERT INTO operators (venue_id, name, pin_hash, role)
  VALUES (v_venue_id, 'Admin', '$2b$10$lrCI84CXN7i/PVEs.hbdBu7GjLz/f4jbdb/l7jFexLiCAQ/RlAfhu', 'admin');
  -- ^ bcrypt hash of '0000' (cost 10) — replace with a real hash in production

  -- Operator: PIN 1234
  INSERT INTO operators (venue_id, name, pin_hash, role)
  VALUES (v_venue_id, 'Operatore 1', '$2b$10$RmDP/FhlLn8OHtsXcgQU5.OfXT1qSFnOhqtXKU56X/Pk8se//d6dm', 'operator');
  -- ^ bcrypt hash of '1234' (cost 10)

  RAISE NOTICE 'Seed venue created: % (id: %)', 'Virtual Zone Roma', v_venue_id;
END $$;
