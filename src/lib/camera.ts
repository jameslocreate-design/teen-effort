import { isNative } from "@/lib/native";
import { toast } from "sonner";

/**
 * Native photo picker via the Capacitor Camera plugin (iOS/Android).
 * - Requests camera/photo permission through the plugin.
 * - Uses a popover on iPad so the action sheet doesn't crash.
 * - Never throws: failures/denials show a message and return null.
 * On web returns undefined so callers fall back to <input type="file">.
 */
export async function pickPhotoNative(): Promise<File | null | undefined> {
  if (!isNative()) return undefined;
  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    let perm = await Camera.checkPermissions();
    if (perm.camera !== "granted" || (perm.photos !== "granted" && perm.photos !== "limited")) {
      perm = await Camera.requestPermissions({ permissions: ["camera", "photos"] });
    }
    const cameraOk = perm.camera === "granted";
    const photosOk = perm.photos === "granted" || perm.photos === "limited";
    if (!cameraOk && !photosOk) {
      toast.error("Camera and photo access are off. Turn them on in Settings › Teen Effort.");
      return null;
    }
    const photo = await Camera.getPhoto({
      quality: 80,
      resultType: CameraResultType.Uri,
      source: cameraOk && photosOk ? CameraSource.Prompt : cameraOk ? CameraSource.Camera : CameraSource.Photos,
      presentationStyle: "popover",
      promptLabelPhoto: "Choose from Library",
      promptLabelPicture: "Take Photo",
      correctOrientation: true,
      width: 1600,
    });
    if (!photo.webPath) return null;
    const blob = await (await fetch(photo.webPath)).blob();
    const ext = photo.format || "jpeg";
    return new File([blob], `photo.${ext}`, { type: blob.type || `image/${ext}` });
  } catch (err: any) {
    const msg = String(err?.message || err || "");
    if (/cancel/i.test(msg)) return null;
    console.warn("Camera failed:", err);
    toast.error(/denied|permission/i.test(msg)
      ? "Camera access is off. Turn it on in Settings › Teen Effort."
      : "Couldn't open the camera. Please try again.");
    return null;
  }
}
