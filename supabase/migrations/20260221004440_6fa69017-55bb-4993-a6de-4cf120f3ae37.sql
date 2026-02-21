-- Clean up all push subscriptions so drivers re-subscribe with the new VAPID key
DELETE FROM push_subscriptions;