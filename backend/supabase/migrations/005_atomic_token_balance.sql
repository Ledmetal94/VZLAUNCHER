-- Atomic increment/decrement of venue token_balance with negative balance guard
CREATE OR REPLACE FUNCTION adjust_token_balance(p_venue_id uuid, p_amount int)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance int;
BEGIN
  UPDATE venues
  SET token_balance = token_balance + p_amount
  WHERE id = p_venue_id
    AND (p_amount >= 0 OR token_balance + p_amount >= 0)
  RETURNING token_balance INTO new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_balance: venue % cannot adjust by %', p_venue_id, p_amount;
  END IF;

  RETURN new_balance;
END;
$$;
