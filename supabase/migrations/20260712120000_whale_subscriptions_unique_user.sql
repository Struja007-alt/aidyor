-- Add unique constraint on whale_subscriptions to enforce one per user
ALTER TABLE whale_subscriptions ADD CONSTRAINT whale_subscriptions_user_id_unique UNIQUE (user_id);

-- Add index on user_id for faster lookups
CREATE INDEX whale_subscriptions_user_id_idx ON whale_subscriptions(user_id);
