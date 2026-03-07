

## Problem

The "Ativar" notification button flashes and disappears because the `useEffect` checks `Notification.permission` on mount. If the browser already has permission granted (e.g., from a previous session), it immediately sets `showNotifBanner = false`, causing the button to render for one frame then vanish.

## Solution

Change the logic so the banner/button visibility is **not** based solely on native `Notification.permission`. Instead, check whether the driver is actually **subscribed to OneSignal** (has a push subscription linked). If OneSignal isn't fully set up (no external ID linked), keep showing the button regardless of native permission state.

### Changes in `src/pages/Motoristas.tsx`

1. **Remove the `showNotifBanner` state** — it's redundant and causes the flash.
2. **Replace the useEffect** to check OneSignal subscription status instead of just `Notification.permission`. Use a flag like `isSubscribed` that only becomes `true` after confirming the user has an active OneSignal push subscription with their external ID set.
3. **Show the headerAction button** whenever `isDriver && !isSubscribed` — the button stays visible until the driver is fully registered in OneSignal.
4. After successful activation in `handleEnableNotifications`, set `isSubscribed = true` to hide the button.

This prevents the flash because the button remains visible until a positive confirmation of subscription, rather than disappearing on a passive permission check.

