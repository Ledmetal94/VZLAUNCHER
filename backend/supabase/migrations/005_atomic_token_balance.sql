-- Atomic increment/decrement of venue token_balance to prevent race conditions
CREATE OR REPLACE FUNCTION adjust_token_balance(p_venue_id uuid, p_amount int)
RETURNS int
LANGUAGE sql
AS $$
  UPDATE venues
  SET token_balance = token_balance + p_amount
  WHERE id = p_venue_id
  RETURNING token_balance;
$$;
