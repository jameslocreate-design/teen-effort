import { isNative } from "@/lib/native";

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy?: number;
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
