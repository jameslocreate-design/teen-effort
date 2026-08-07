import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import { initNative } from "./lib/native";
import "./index.css";


const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (!isInIframe && !isPreviewHost) {
  // Reload once as soon as a new service worker takes control, so a freshly
  // published version shows up immediately instead of on the next visit.
  let reloading = false;
  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Check for a new build on load, on tab focus, and every 60s.
      const check = () => registration.update().catch(() => {});
      check();
      window.addEventListener("focus", check);
      setInterval(check, 60_000);
    },
  });
  void updateSW;
}


if (isInIframe || isPreviewHost) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });
}

void initNative();


createRoot(document.getElementById("root")!).render(<App />);
