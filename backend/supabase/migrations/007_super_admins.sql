-- Super-admin table (separate from venue operators)
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Refresh tokens for super-admins (reuse same structure, add nullable super_admin_id)
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS super_admin_id UUID REFERENCES super_admins(id) ON DELETE CASCADE;
ALTER TABLE refresh_tokens ALTER COLUMN operator_id DROP NOT NULL;

-- Add venue logo and config columns
ALTER TABLE venues ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{}';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS default_token_cost INTEGER DEFAULT 1;

-- Seed: Super-admin (superadmin / superadmin2026)
-- bcrypt hash of "superadmin2026" (10 rounds)
INSERT INTO super_admins (id, name, username, password_hash)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  'Super Admin',
  'superadmin',
  '$2b$10$mR9lFxc8vlR9uCxKUDrqFO6APJuTt5409.UbUk.4/XLGkYAa4wHz6'
) ON CONFLICT (username) DO NOTHING;
