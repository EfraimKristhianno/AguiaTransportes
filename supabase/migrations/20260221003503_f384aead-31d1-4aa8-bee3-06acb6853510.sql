-- Clean up all push subscriptions so drivers re-subscribe with the correct VAPID key
DELETE FROM push_subscriptions;