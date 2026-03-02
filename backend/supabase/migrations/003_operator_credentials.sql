-- ============================================================
-- Migration 003: Add username/password auth to operators
-- Replaces the 2-level auth (venue key + PIN) with a single
-- username+password login that returns a role-bearing JWT.
-- ============================================================

-- Add username and password_hash columns to operators
ALTER TABLE operators ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Extend the role constraint to accept 'normal' (replaces 'operator')
ALTER TABLE operators DROP CONSTRAINT IF EXISTS operators_role_check;
ALTER TABLE operators ADD CONSTRAINT operators_role_check
  CHECK (role IN ('admin', 'normal', 'operator'));

-- ─── Update dev seed with username+password credentials ──────────────────────
-- Admin:  username=vzadmin   password=vzadmin2026
-- Staff:  username=vzstaff   password=vzstaff2026
DO $$
BEGIN
  UPDATE operators
  SET username      = 'vzadmin',
      password_hash = '$2b$10$k3F33F5ep0Lv.StumQa6uuNh96fzY0sLLv7Hr7PgetGD/5soUZihq',
      role          = 'admin'
  WHERE name = 'Admin';

  UPDATE operators
  SET username      = 'vzstaff',
      password_hash = '$2b$10$3KeVmbKbRwAUprzlUURT0uhb8/oV/1Z2ApjRR5xdA6X8vy9p7HcIG',
      role          = 'normal'
  WHERE name = 'Operatore 1';
END $$;
