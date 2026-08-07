import { isNative } from "@/lib/native";

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type LocationPermission = "granted" | "denied" | "prompt" | "unknown";

/** Reads the current location permission without triggering a prompt. */
export async function checkLocationPermission(): Promise<LocationPermission> {
  if (isNative()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.checkPermissions();
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
    const { Geolocation } = await import("@capacitor/geolocation");
    let perm = await Geolocation.checkPermissions();
    if (perm.location !== "granted") {
      perm = await Geolocation.requestPermissions({ permissions: ["location"] });
    }
    return perm.location === "granted";
  }
  try {
    await getCurrentCoords({ timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the current location. On native iOS/Android we use the Capacitor
 * Geolocation plugin (which prompts with the Info.plist usage strings and works
 * reliably inside WKWebView); on web we fall back to navigator.geolocation.
 */
export async function getCurrentCoords(opts?: {
  timeout?: number;
  enableHighAccuracy?: boolean;
}): Promise<Coords> {
  const timeout = opts?.timeout ?? 10000;
  const enableHighAccuracy = opts?.enableHighAccuracy ?? true;

  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    let perm = await Geolocation.checkPermissions();
    if (perm.location !== "granted") {
      perm = await Geolocation.requestPermissions({ permissions: ["location"] });
    }
    if (perm.location !== "granted") throw new Error("Location permission denied");
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy, timeout });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  }

  if (!navigator.geolocation) throw new Error("Geolocation unavailable");
  const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy,
      timeout,
      maximumAge: 0,
    })
  );
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
  };
}
