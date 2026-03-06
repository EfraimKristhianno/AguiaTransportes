declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => Promise<void>>;
  }
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force cache clear on load - v8
if ('caches' in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      caches.delete(name);
    });
  });
}

// Unregister old service workers (but keep OneSignal's)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      // Keep OneSignal service worker alive
      if (registration.active?.scriptURL?.includes('OneSignalSDK')) {
        return;
      }
      registration.unregister();
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
