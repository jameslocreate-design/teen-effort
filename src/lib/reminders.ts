import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/native";

/**
 * Local (on-device) banner reminders for upcoming dates.
 * No email, no server: iOS shows a notification banner even if the app is closed.
 * No-op on the web build.
 */

const CHANNEL_ID = "date-reminders";

/** Stable small integer id derived from a uuid string. */
function idFor(uuid: string, salt: number) {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) h = (h * 31 + uuid.charCodeAt(i)) | 0;
  return Math.abs(h % 1_000_000) * 10 + salt;
}

async function ensurePermission() {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display === "prompt" || perm.display === "prompt-with-rationale") {
    perm = await LocalNotifications.requestPermissions();
  }
  return perm.display === "granted";
}

/**
 * Re-syncs all scheduled banners with the user's upcoming calendar entries.
 * Safe to call often — it clears previously scheduled reminders first.
 */
export async function syncDateReminders() {
  if (!isNative()) return;

  const { LocalNotifications } = await import("@capacitor/local-notifications");
  if (!(await ensurePermission())) return;

  // Clear anything we previously scheduled so edits/deletes are reflected.
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }

  const todayIso = new Date().toISOString().split("T")[0];
  const { data: entries } = await supabase
    .from("calendar_entries")
    .select("id, title, date, event_time")
    .gte("date", todayIso)
    .order("date", { ascending: true })
    .limit(12);

  if (!entries?.length) return;

  const now = Date.now();
  const scheduled: Array<Record<string, unknown>> = [];

  for (const entry of entries) {
    const time = entry.event_time ?? "18:00";
    const [h, m] = time.split(":").map(Number);
    const start = new Date(`${entry.date}T00:00:00`);
    start.setHours(h || 18, m || 0, 0, 0);

    const name = `"${entry.title}"`;
    const timeLabel = new Date(start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    // Short, simple one-liners across the whole day.
    const plan: Array<{ salt: number; at: Date; title: string; body: string }> = [];

    // Evening before, 7pm
    const dayBefore = new Date(start);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(19, 0, 0, 0);
    plan.push({ salt: 1, at: dayBefore, title: "Date tomorrow 💕", body: `You have a ${name} date tomorrow at ${timeLabel}.` });

    // Morning of, 9am
    const morning = new Date(start);
    morning.setHours(9, 0, 0, 0);
    plan.push({ salt: 2, at: morning, title: "Date today 💗", body: `You have a ${name} date today at ${timeLabel}.` });

    // Midday check-in, 2pm (only if the date is later in the day)
    const midday = new Date(start);
    midday.setHours(14, 0, 0, 0);
    if (midday.getTime() < start.getTime()) {
      plan.push({ salt: 3, at: midday, title: "Get ready ✨", body: `Your ${name} date is at ${timeLabel}.` });
    }

    // 2 hours before
    plan.push({
      salt: 4,
      at: new Date(start.getTime() - 2 * 60 * 60 * 1000),
      title: "In 2 hours ⏳",
      body: `You have a ${name} date in two hours.`,
    });

    // 30 minutes before
    plan.push({
      salt: 5,
      at: new Date(start.getTime() - 30 * 60 * 1000),
      title: "Almost time 🌹",
      body: `Your ${name} date starts in 30 minutes.`,
    });

    // At start
    plan.push({ salt: 6, at: start, title: "It's date time 💞", body: `Your ${name} date starts now. Have fun!` });

    for (const p of plan) {
      if (p.at.getTime() <= now) continue;
      scheduled.push({
        id: idFor(entry.id, p.salt),
        title: p.title,
        body: p.body,
        schedule: { at: p.at, allowWhileIdle: true },
        channelId: CHANNEL_ID,
        extra: { path: "/", entryId: entry.id },
      });
    }
  }

  if (!scheduled.length) return;

  // iOS caps pending notifications at 64 — keep the soonest ones.
  scheduled.sort((a, b) => {
    const at = (a.schedule as { at: Date }).at.getTime();
    const bt = (b.schedule as { at: Date }).at.getTime();
    return at - bt;
  });
  await LocalNotifications.schedule({ notifications: scheduled.slice(0, 60) as never });
}

/** Immediate banner (used for in-the-moment alerts like partner activity). */
export async function showBanner(title: string, body: string, path = "/") {
  if (!isNative()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  if (!(await ensurePermission())) return;
  await LocalNotifications.schedule({
    notifications: [
      {
        id: Math.floor(Math.random() * 1_000_000),
        title,
        body,
        channelId: CHANNEL_ID,
        extra: { path },
      },
    ],
  });
}

/** Wires tap-through so a banner opens the right screen. */
export async function initReminderTaps() {
  if (!isNative()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.removeAllListeners();
  await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
    const path = (action.notification.extra as Record<string, string> | undefined)?.path;
    if (path && path.startsWith("/")) window.location.assign(path);
  });
}
