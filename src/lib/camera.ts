import { isNative } from "@/lib/native";
import { toast } from "sonner";

/**
 * Native photo picker via the Capacitor Camera plugin (iOS/Android).
 * - Requests camera/photo permission through the plugin.
 * - Uses a popover on iPad so the action sheet doesn't crash.
 * - Never throws: failures/denials show a message and return null.
 * On web returns undefined so callers fall back to <input type="file">.
 */
let inFlight = false;

export async function pickPhotoNative(): Promise<File | null | undefined> {
  if (!isNative()) return undefined;
  // Ignore double taps while the camera sheet is already opening.
  if (inFlight) return null;
  inFlight = true;
  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    // Only bail early if the user has already turned access off in Settings.
    // Otherwise let getPhoto ask for exactly the permission it needs
    // (camera OR photos) once the user picks an option.
    try {
      const perm = await Camera.checkPermissions();
      if (perm.camera === "denied" && perm.photos === "denied") {
        toast.error("Camera and photo access are off. Turn them on in Settings › Teen Effort.");
        return null;
      }
    } catch {
      /* checkPermissions unavailable — continue and let getPhoto handle it */
    }
    const photo = await Camera.getPhoto({
      quality: 80,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
      presentationStyle: "popover",
      promptLabelHeader: "Add a photo",
      promptLabelPhoto: "Choose from Library",
      promptLabelPicture: "Take Photo",
      promptLabelCancel: "Cancel",
      correctOrientation: true,
      width: 1600,
      saveToGallery: false,
    });
    if (!photo?.webPath) return null;
    const res = await fetch(photo.webPath);
    if (!res.ok) throw new Error("Couldn't read the photo");
    const blob = await res.blob();
    const ext = photo.format || "jpeg";
    return new File([blob], `photo.${ext}`, { type: blob.type || `image/${ext}` });
  } catch (err: any) {
    const msg = String(err?.message || err || "");
    if (/cancel/i.test(msg)) return null;
    console.warn("Camera failed:", err);
    toast.error(/denied|permission|access/i.test(msg)
      ? "Camera access is off. Turn it on in Settings › Teen Effort."
      : "Couldn't open the camera. Please try again.");
    return null;
  } finally {
    inFlight = false;
  }
}
