CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'consume', 'adjustment', 'refund')),
  amount INTEGER NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('stripe', 'bank_transfer', 'manual')),
  payment_reference TEXT,
  unit_price DECIMAL(10,4),
  total_price DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_token_tx_venue ON token_transactions(venue_id);
CREATE INDEX idx_token_tx_created ON token_transactions(created_at DESC);
CREATE INDEX idx_token_tx_reference ON token_transactions(payment_reference);
