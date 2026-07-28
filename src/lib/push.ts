import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/native";

/**
 * Registers the device for Apple Push Notifications (APNs) and stores the
 * token against the signed-in user so backend functions can send date
 * reminders and partner activity alerts. No-op on the web build.
 */
export async function registerPush(userId: string) {
  if (!isNative()) return;

  const { PushNotifications } = await import("@capacitor/push-notifications");

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== "granted") return;

  PushNotifications.removeAllListeners();

  PushNotifications.addListener("registration", async (token) => {
    await supabase.from("push_tokens").upsert(
      { user_id: userId, token: token.value, platform: "ios" },
      { onConflict: "token" },
    );
  });

  PushNotifications.addListener("registrationError", () => {
    /* device offline or APNs not provisioned — silently ignore */
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const path = (action.notification.data as Record<string, string> | undefined)?.path;
    if (path && path.startsWith("/")) window.location.assign(path);
  });

  await PushNotifications.register();
}

/** Clears the badge count (call when the app returns to the foreground). */
export async function clearPushBadge() {
  if (!isNative()) return;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  await PushNotifications.removeAllDeliveredNotifications().catch(() => {});
}
