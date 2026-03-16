-- VZLAUNCHER Initial Schema
-- Venues, Operators, Sessions, Game Configs

CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  contact_email TEXT,
  token_balance INTEGER NOT NULL DEFAULT 0,
  pc_local_ip TEXT,
  vnc_port INTEGER DEFAULT 5900,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'onboarding')),
  license_last_renew TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'normal' CHECK (role IN ('admin', 'normal')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('herozone', 'vex', 'spawnpoint')),
  category TEXT NOT NULL CHECK (category IN ('arcade_light', 'arcade_full', 'avventura', 'lasergame', 'escape')),
  min_players INTEGER NOT NULL DEFAULT 1,
  max_players INTEGER NOT NULL DEFAULT 6,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  token_cost INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  thumbnail_url TEXT,
  badge TEXT CHECK (badge IN ('NEW', 'HOT', 'TOP')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  game_id UUID REFERENCES game_configs(id),
  operator_id UUID REFERENCES operators(id),
  platform TEXT NOT NULL,
  category TEXT NOT NULL,
  players_count INTEGER NOT NULL DEFAULT 1,
  duration_planned INTEGER, -- seconds
  duration_actual INTEGER, -- seconds
  tokens_consumed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'error', 'cancelled')),
  error_log TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_operators_venue ON operators(venue_id);
CREATE INDEX idx_operators_username ON operators(username);
CREATE INDEX idx_sessions_venue ON sessions(venue_id);
CREATE INDEX idx_sessions_started ON sessions(started_at DESC);

-- Seed: Virtual Zone Roma venue
INSERT INTO venues (id, name, address, contact_email, token_balance, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Virtual Zone Roma',
  'Via Example 42, Roma',
  'roma@virtualzonevr.it',
  500,
  'active'
);

-- Seed: Admin operator (vzadmin / vzadmin2026)
-- bcrypt hash of "vzadmin2026"
INSERT INTO operators (id, venue_id, name, username, password_hash, role)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Admin VZ',
  'vzadmin',
  '$2b$10$eMvdbzYp2SuYMQGPZJUd5uhoDLWxqAqiWOwTpFrYsSaOl8crcG2D.',
  'admin'
);

-- Seed: Normal operator (vzstaff / vzstaff2026)
-- bcrypt hash of "vzstaff2026"
INSERT INTO operators (id, venue_id, name, username, password_hash, role)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'Operatore 1',
  'vzstaff',
  '$2b$10$ks6BOoWMPqL7whVrAeyZxu8/n.NfFShM.JIg50E1YFXzeOy/FhPFC',
  'normal'
);
