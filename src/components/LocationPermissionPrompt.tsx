import { useCallback, useEffect, useState } from "react";
import { MapPin, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNative } from "@/lib/native";
import {
  checkLocationPermission,
  openLocationSettings,
  requestLocationAccess,
  type LocationPermission,
} from "@/lib/geo";
import { toast } from "sonner";

const DISMISS_KEY = "location-prompt-dismissed";
const DENIED_DISMISS_KEY = "location-denied-hint-dismissed";

/**
 * Native-only nudge that explains why we need location before the iOS system
 * dialog appears (Apple requires context, and a cold prompt gets denied).
 * If the user already denied, iOS will never prompt again, so we show a
 * "Open Settings" hint instead and re-check when the app returns to foreground.
 */
const LocationPermissionPrompt = () => {
  const [state, setState] = useState<LocationPermission | null>(null);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  const refresh = useCallback(async () => {
    const next = await checkLocationPermission();
    setState(next);
    if (next === "granted") setHidden(true);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let remove: (() => void) | undefined;

    checkLocationPermission().then((next) => {
      if (cancelled) return;
      setState(next);
    });

    // Coming back from Settings should pick up a newly granted permission.
    if (isNative()) {
      import("@capacitor/app")
        .then(({ App }) =>
          App.addListener("appStateChange", ({ isActive }) => {
            if (isActive) refresh();
          })
        )
        .then((handle) => {
          remove = () => handle.remove();
        })
        .catch(() => {});
    } else {
      const onVisible = () => {
        if (document.visibilityState === "visible") refresh();
      };
      document.addEventListener("visibilitychange", onVisible);
      remove = () => document.removeEventListener("visibilitychange", onVisible);
    }

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [refresh]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  };

  const dismissDeniedHint = () => {
    localStorage.setItem(DENIED_DISMISS_KEY, "1");
    setHidden(true);
  };

  const allow = async () => {
    setBusy(true);
    try {
      const granted = await requestLocationAccess();
      if (granted) {
        toast.success("Location enabled — nearby date ideas unlocked");
        localStorage.setItem(DISMISS_KEY, "1");
        setState("granted");
        setHidden(true);
      } else {
        const next = await checkLocationPermission();
        setState(next);
        toast.error(
          next === "granted"
            ? "Location is allowed, but your position could not be found. Check that Location Services are on."
            : "Location was not enabled."
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const openSettings = async () => {
    const opened = await openLocationSettings();
    if (!opened) {
      toast.error(
        isNative()
          ? "Open Settings › Teen Effort › Location to turn it on."
          : "In Safari, tap the \u201CaA\u201D icon in the address bar › Website Settings › Location › Allow. On desktop, use Safari › Settings › Websites › Location."
      );
    }
  };

  if (hidden || state === null || state === "granted") return null;
  // Safari has no Permissions API for geolocation, so "unknown" still needs the prompt.

  const denied = state === "denied";
  if (denied && localStorage.getItem(DENIED_DISMISS_KEY) === "1") return null;
  if (!denied && localStorage.getItem(DISMISS_KEY) === "1") return null;

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-primary/30 bg-primary/10 p-4 flex items-start gap-3">
      <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
        <MapPin className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {denied ? "Location is turned off" : "Allow location access"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {denied
            ? (isNative()
                ? "Teen Effort can't see your location, so date ideas won't be nearby. Turn it back on in Settings › Teen Effort › Location."
                : "Your browser is blocking location, so date ideas won't be nearby. Re-allow it in your browser's site settings for this page.")
            : "We use your location to find date spots and weather near you. Nothing is shared with anyone else."}
        </p>
        <div className="mt-3 flex gap-2">
          {denied ? (
            <Button size="sm" onClick={isNative() ? openSettings : allow} disabled={busy} className="h-9 rounded-xl gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              {isNative() ? "Open Settings" : busy ? "Retrying..." : "Try again"}
            </Button>
          ) : (
            <Button size="sm" onClick={allow} disabled={busy} className="h-9 rounded-xl">
              {busy ? "Requesting..." : "Allow location"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={denied ? dismissDeniedHint : dismiss}
            className="h-9 rounded-xl"
          >
            Not now
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={denied ? dismissDeniedHint : dismiss}
        aria-label="Dismiss location prompt"
        className="text-muted-foreground hover:text-foreground p-1"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default LocationPermissionPrompt;
