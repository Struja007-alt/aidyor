-- Adds the column that whale-alerts and stripe-webhook already expect.
-- Nullable: NULL = no expiry known. Table currently has 0 rows, so this is safe.
alter table public.whale_subscriptions
  add column if not exists expires_at timestamptz;
