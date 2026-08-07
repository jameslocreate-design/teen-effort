import { registerSW } from "virtual:pwa-register";

const PREVIEW_HOSTS = [
  "lovableproject.com",
  "lovableproject-dev.com",
  "beta.lovable.dev",
];

function isEmbedded() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(hostname: string) {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    PREVIEW_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    )
  );
}

function isAppServiceWorker(registration: ServiceWorkerRegistration) {
  const workers = [
    registration.installing,
    registration.waiting,
    registration.active,
  ];

  return workers.some((worker) => {
    if (!worker) return false;

    try {
      return new URL(worker.scriptURL).pathname === "/sw.js";
    } catch {
      return false;
    }
  });
}

async function unregisterAppServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter(isAppServiceWorker)
      .map((registration) => registration.unregister()),
  );
}

export async function registerAppServiceWorker() {
  const disabled = new URLSearchParams(window.location.search).get("sw") === "off";
  const shouldRefuse =
    !import.meta.env.PROD ||
    isEmbedded() ||
    isPreviewHost(window.location.hostname) ||
    disabled;

  if (shouldRefuse) {
    await unregisterAppServiceWorkers();
    return;
  }

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      void registration?.update();
    },
  });
}