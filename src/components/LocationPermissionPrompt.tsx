import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNative } from "@/lib/native";
import { checkLocationPermission, requestLocationAccess } from "@/lib/geo";
import { toast } from "sonner";

const DISMISS_KEY = "location-prompt-dismissed";

/**
 * Native-only nudge that explains why we need location before the iOS system
 * dialog appears (Apple requires context, and a cold prompt gets denied).
 */
const LocationPermissionPrompt = () => {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isNative()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    let cancelled = false;
    checkLocationPermission().then((state) => {
      if (!cancelled && state !== "granted") setShow(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  const allow = async () => {
    setBusy(true);
    try {
      const granted = await requestLocationAccess();
      if (granted) {
        toast.success("Location enabled — nearby date ideas unlocked");
        dismiss();
      } else {
        toast.error("Location is off. Enable it in Settings › Teen Effort › Location.");
        dismiss();
      }
    } finally {
      setBusy(false);
    }
  };

  if (!show) return null;

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-primary/30 bg-primary/10 p-4 flex items-start gap-3">
      <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
        <MapPin className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Allow location access</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          We use your location to find date spots and weather near you. Nothing is shared with
          anyone else.
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={allow} disabled={busy} className="h-9 rounded-xl">
            {busy ? "Requesting..." : "Allow location"}
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss} className="h-9 rounded-xl">
            Not now
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss location prompt"
        className="text-muted-foreground hover:text-foreground p-1"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default LocationPermissionPrompt;
