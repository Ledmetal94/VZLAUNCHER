-- Make payment_reference unique to enforce idempotency on webhook processing
DROP INDEX IF EXISTS idx_token_tx_reference;
CREATE UNIQUE INDEX idx_token_tx_reference ON token_transactions(payment_reference) WHERE payment_reference IS NOT NULL;
