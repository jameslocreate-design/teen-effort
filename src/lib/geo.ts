import { isNative } from "@/lib/native";

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type LocationPermission = "granted" | "denied" | "prompt" | "unknown";

export const LOCATION_READY_EVENT = "teen-effort:location-ready";

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);

/** Reads the current location permission without triggering a prompt. */
export async function checkLocationPermission(): Promise<LocationPermission> {
  if (isNative()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await withTimeout(
        Geolocation.checkPermissions(),
        5000,
        "Location permission check timed out"
      );
      if (perm.location === "granted") return "granted";
      if (perm.location === "denied") return "denied";
      return "prompt";
    } catch {
      return "unknown";
    }
  }
  if (!navigator.permissions?.query) return "unknown";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return status.state as LocationPermission;
  } catch {
    return "unknown";
  }
}

/**
 * Explicitly asks the user for location access (shows the iOS system prompt).
 * Returns true when access is granted.
 */
export async function requestLocationAccess(): Promise<boolean> {
  if (isNative()) {
    if (permissionRequest) return permissionRequest;
    permissionRequest = (async () => {
      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        let perm = await withTimeout(
          Geolocation.checkPermissions(),
          5000,
          "Location permission check timed out"
        );
        if (perm.location !== "granted") {
          perm = await withTimeout(
            Geolocation.requestPermissions({ permissions: ["location"] }),
            12000,
            "Location permission request timed out"
          );
        }
        if (perm.location !== "granted") return false;

        // Resolve one real position before telling the UI location is ready.
        // Coarse accuracy is fast and sufficient for nearby venue suggestions.
        await getCurrentCoords({ timeout: 12000, enableHighAccuracy: false });
        window.dispatchEvent(new CustomEvent(LOCATION_READY_EVENT));
        return true;
      } catch (error) {
        console.warn("Location access failed:", error);
        return false;
      } finally {
        permissionRequest = null;
      }
    })();
    return permissionRequest;
  }
  // Web (including Safari): the browser only shows its prompt when
  // getCurrentPosition is called, and Safari requires that call to happen in a
  // user gesture — this helper is always invoked from a button click.
  if (permissionRequest) return permissionRequest;
  permissionRequest = (async () => {
    try {
      // Safari can hang on high accuracy; coarse is enough and much faster.
      await getCurrentCoords({ timeout: 15000, enableHighAccuracy: false });
      window.dispatchEvent(new CustomEvent(LOCATION_READY_EVENT));
      return true;
    } catch (error) {
      console.warn("Location access failed:", error);
      return false;
    } finally {
      permissionRequest = null;
    }
  })();
  return permissionRequest;
}

// A single in-flight request shared by every caller, plus a short-lived cache.
// Without this, each widget (map, weather, planner, swipe, recommendations)
// fires its own lookup and iOS ends up queuing prompt after prompt.
const CACHE_MS = 5 * 60 * 1000;
let cached: { coords: Coords; at: number } | null = null;
let inFlight: Promise<Coords> | null = null;
let permissionRequest: Promise<boolean> | null = null;

/**
 * Gets the current location. On native iOS/Android we use the Capacitor
 * Geolocation plugin (which prompts with the Info.plist usage strings and works
 * reliably inside WKWebView); on web we fall back to navigator.geolocation.
 * Concurrent callers share one lookup, and results are cached for 5 minutes.
 */
export async function getCurrentCoords(opts?: {
  timeout?: number;
  enableHighAccuracy?: boolean;
}): Promise<Coords> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.coords;
  if (inFlight) return inFlight;

  const timeout = opts?.timeout ?? 10000;
  const enableHighAccuracy = opts?.enableHighAccuracy ?? true;

  inFlight = (async () => {
    const coords = await lookup(timeout, enableHighAccuracy);
    cached = { coords, at: Date.now() };
    return coords;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

async function lookup(timeout: number, enableHighAccuracy: boolean): Promise<Coords> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await withTimeout(
      Geolocation.checkPermissions(),
      5000,
      "Location permission check timed out"
    );
    if (perm.location !== "granted") {
      throw new Error(perm.location === "denied" ? "Location permission denied" : "Location permission required");
    }
    try {
      const pos = await withTimeout(
        Geolocation.getCurrentPosition({
          enableHighAccuracy,
          timeout,
          maximumAge: CACHE_MS,
        }),
        timeout + 2000,
        "Location lookup timed out"
      );
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
    } catch {
      // High accuracy can hang indefinitely indoors on iOS — retry coarse.
      if (!enableHighAccuracy) throw new Error("Unable to determine location");
      const retryTimeout = Math.max(timeout, 12000);
      const pos = await withTimeout(
        Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: retryTimeout,
          maximumAge: CACHE_MS,
        }),
        retryTimeout + 2000,
        "Location lookup timed out"
      );
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
    }
  }

  if (!navigator.geolocation) throw new Error("Geolocation unavailable");
  const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy,
      timeout,
      maximumAge: CACHE_MS,
    })
  );
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
  };
}


/**
 * Opens the OS settings screen for the app so a user who previously tapped
 * "Don't Allow" can re-enable location (iOS never re-prompts after a denial).
 */
export async function openLocationSettings(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    // iOS honours the app-settings: scheme from the WKWebView when opened
    // in the system browser target.
    const opened = window.open("app-settings:", "_system");
    if (!opened) window.location.href = "app-settings:";
    return true;
  } catch {
    return false;
  }
}
