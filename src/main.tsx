import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force cache clear on load - v22
if ('caches' in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      caches.delete(name);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
