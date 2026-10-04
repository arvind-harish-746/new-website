import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register Service Worker for offline fallback
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        reg.update();
      })
      .catch(() => {
        // Service worker registration failed — offline fallback won't be available
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
