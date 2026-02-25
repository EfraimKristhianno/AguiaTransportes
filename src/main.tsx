import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force clear outdated SW caches on load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.update());
  });
  caches.keys().then(names => {
    names.forEach(name => {
      if (name.includes('workbox') || name.includes('precache')) {
        caches.delete(name);
      }
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
