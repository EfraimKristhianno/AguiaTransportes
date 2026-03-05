-- Clear all stale push subscriptions created with old VAPID keys
-- Devices will automatically re-subscribe with the new keys on next login
DELETE FROM push_subscriptions;