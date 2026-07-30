import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/native";

/**
 * Local (on-device) banner reminders.
 * No email, no server: iOS shows a notification banner even if the app is closed.
 * No-op on the web build.
 */

const CHANNEL_ID = "date-reminders";

type Planned = { id: number; at: Date; title: string; body: string; path?: string };

/** Stable small integer id derived from a string. */
function idFor(key: string, salt: number) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
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

function atTime(base: Date, h: number, m = 0) {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

function buildDatePlans(
  entries: Array<{ id: string; title: string; date: string; event_time: string | null }>,
): Planned[] {
  const out: Planned[] = [];
  for (const entry of entries) {
    const time = entry.event_time ?? "18:00";
    const [h, m] = time.split(":").map(Number);
    const start = new Date(`${entry.date}T00:00:00`);
    start.setHours(h || 18, m || 0, 0, 0);

    const name = `"${entry.title}"`;
    const timeLabel = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    const dayBefore = atTime(new Date(start.getTime() - 86400000), 19);
    out.push({ id: idFor(entry.id, 1), at: dayBefore, title: "Date tomorrow 💕", body: `You have a ${name} date tomorrow at ${timeLabel}.` });
    out.push({ id: idFor(entry.id, 2), at: atTime(start, 9), title: "Date today 💗", body: `You have a ${name} date today at ${timeLabel}.` });

    const midday = atTime(start, 14);
    if (midday.getTime() < start.getTime()) {
      out.push({ id: idFor(entry.id, 3), at: midday, title: "Get ready ✨", body: `Your ${name} date is at ${timeLabel}.` });
    }
    out.push({ id: idFor(entry.id, 4), at: new Date(start.getTime() - 2 * 3600000), title: "In 2 hours ⏳", body: `You have a ${name} date in two hours.` });
    out.push({ id: idFor(entry.id, 5), at: new Date(start.getTime() - 30 * 60000), title: "Almost time 🌹", body: `Your ${name} date starts in 30 minutes.` });
    out.push({ id: idFor(entry.id, 6), at: start, title: "It's date time 💞", body: `Your ${name} date starts now. Have fun!` });
  }
  return out.map((p) => ({ ...p, path: "/" }));
}

/** Birthdays, anniversaries and other saved special events: 1 week, 1 day and morning-of. */
function buildSpecialEventPlans(
  events: Array<{ id: string; title: string; event_date: string; event_type: string; recurring: boolean }>,
): Planned[] {
  const out: Planned[] = [];
  const now = new Date();

  for (const ev of events) {
    let date = new Date(`${ev.event_date}T00:00:00`);
    if (ev.recurring) {
      date.setFullYear(now.getFullYear());
      if (date.getTime() < now.getTime() - 86400000) date.setFullYear(now.getFullYear() + 1);
    }
    if (date.getTime() < now.getTime() - 86400000) continue;

    const label = ev.event_type === "birthday" ? "Birthday" : ev.event_type === "anniversary" ? "Anniversary" : "Special day";
    out.push({ id: idFor(ev.id, 1), at: atTime(new Date(date.getTime() - 7 * 86400000), 10), title: `${label} in a week 🎁`, body: `${ev.title} is one week away — start planning!` });
    out.push({ id: idFor(ev.id, 2), at: atTime(new Date(date.getTime() - 86400000), 18), title: `${label} tomorrow 🎉`, body: `${ev.title} is tomorrow.` });
    out.push({ id: idFor(ev.id, 3), at: atTime(date, 8), title: `${label} today 💝`, body: `Today is ${ev.title}!` });
  }
  return out.map((p) => ({ ...p, path: "/" }));
}

/** Relationship milestones based on how long the partner link has existed. */
function buildMilestonePlans(linkId: string, linkedAtIso: string): Planned[] {
  const start = new Date(linkedAtIso);
  const out: Planned[] = [];
  const months = [1, 2, 3, 6, 12];
  months.forEach((n, i) => {
    const at = new Date(start);
    at.setMonth(at.getMonth() + n);
    at.setHours(10, 0, 0, 0);
    const label = n === 12 ? "1 year" : `${n}-month`;
    out.push({
      id: idFor(linkId, 100 + i),
      at,
      title: `Happy ${label} anniversary! 💕`,
      body: `You've been connected on Teen Effort for ${label}. Celebrate with a date!`,
    });
  });
  return out.map((p) => ({ ...p, path: "/" }));
}

/** Milestone for number of dates completed together. */
function buildDateCountPlan(linkId: string, count: number): Planned[] {
  const tiers = [5, 10, 25, 50];
  const hit = tiers.filter((t) => count >= t).pop();
  if (!hit) return [];
  const key = `te-datecount-${linkId}-${hit}`;
  if (localStorage.getItem(key)) return [];
  localStorage.setItem(key, "1");
  const at = new Date(Date.now() + 60000);
  return [
    {
      id: idFor(key, 1),
      at,
      title: `${hit} dates together! 🎉`,
      body: `You've been on ${hit} dates together — keep it up!`,
      path: "/",
    },
  ];
}

/** Weekly Friday prompt + a nudge when nothing is on the calendar. */
function buildEngagementPlans(hasUpcomingDate: boolean): Planned[] {
  const out: Planned[] = [];
  const now = new Date();

  // Next 4 Thursdays: plan-the-weekend prompt.
  for (let w = 0; w < 4; w++) {
    const d = new Date(now);
    const daysToThu = (4 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + daysToThu + w * 7);
    out.push({
      id: idFor("weekend-prompt", w),
      at: atTime(d, 17),
      title: "Weekend plans? 🌙",
      body: "The weekend is almost here — plan a date together!",
    });
  }

  // No upcoming date: gentle nudge in 3 days and again in 7.
  if (!hasUpcomingDate) {
    [3, 7].forEach((days, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      out.push({
        id: idFor("no-date-nudge", i),
        at: atTime(d, 18),
        title: "Nothing planned yet 🌹",
        body: "No date on the calendar — pick a fresh idea and surprise them.",
      });
    });
  }

  // Re-engagement if the app isn't opened again (rescheduled on every open).
  [5, 14].forEach((days, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    out.push({
      id: idFor("re-engage", i),
      at: atTime(d, 19),
      title: "We miss you 💗",
      body: "Plan your next date night on Teen Effort.",
    });
  });

  return out.map((p) => ({ ...p, path: "/" }));
}

/* ------------------------------------------------------------------ */
/* Sync                                                                */
/* ------------------------------------------------------------------ */

/**
 * Re-syncs every scheduled banner (dates, special events, milestones, nudges).
 * Safe to call often — it clears previously scheduled reminders first.
 */
export async function syncDateReminders() {
  if (!isNative()) return;

  const { LocalNotifications } = await import("@capacitor/local-notifications");
  if (!(await ensurePermission())) return;

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }

  const todayIso = new Date().toISOString().split("T")[0];
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;

  const [entriesRes, eventsRes, linkRes, countRes] = await Promise.all([
    supabase
      .from("calendar_entries")
      .select("id, title, date, event_time")
      .gte("date", todayIso)
      .order("date", { ascending: true })
      .limit(12),
    supabase.from("special_events").select("id, title, event_date, event_type, recurring").limit(20),
    userId
      ? supabase.from("partner_links").select("id, created_at").eq("status", "accepted").limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("calendar_entries").select("id", { count: "exact", head: true }).lt("date", todayIso),
  ]);

  const entries = entriesRes.data ?? [];
  const plans: Planned[] = [
    ...buildDatePlans(entries),
    ...buildSpecialEventPlans(eventsRes.data ?? []),
    ...buildEngagementPlans(entries.length > 0),
  ];

  const link = (linkRes as { data: { id: string; created_at: string } | null }).data;
  if (link) {
    plans.push(...buildMilestonePlans(link.id, link.created_at));
    plans.push(...buildDateCountPlan(link.id, (countRes as { count?: number }).count ?? 0));
  }

  const now = Date.now();
  const scheduled = plans
    .filter((p) => p.at.getTime() > now)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 60)
    .map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      schedule: { at: p.at, allowWhileIdle: true },
      channelId: CHANNEL_ID,
      extra: { path: p.path ?? "/" },
    }));

  if (!scheduled.length) return;
  await LocalNotifications.schedule({ notifications: scheduled as never });
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

/* ------------------------------------------------------------------ */
/* Partner activity (realtime -> instant banner)                       */
/* ------------------------------------------------------------------ */

let activityChannel: ReturnType<typeof supabase.channel> | null = null;

/** Live banners when your partner adds a date, bucket item or love letter. */
export async function startPartnerActivityWatch(userId: string) {
  if (!isNative() || activityChannel) return;

  const { data: linkId } = await supabase.rpc("get_accepted_partner_link_id", { _user_id: userId });
  if (!linkId) return;

  const filter = `partner_link_id=eq.${linkId}`;
  activityChannel = supabase
    .channel(`partner-activity-${linkId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "calendar_entries", filter }, (payload) => {
      const row = payload.new as { added_by: string; title: string };
      if (row.added_by === userId) return;
      showBanner("New date planned 💞", `Your partner added "${row.title}" to your calendar.`, "/");
      syncDateReminders().catch(() => {});
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "bucket_list", filter }, (payload) => {
      const row = payload.new as { added_by: string; title: string };
      if (row.added_by === userId) return;
      showBanner("Bucket list update ✨", `Your partner added "${row.title}".`, "/");
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "love_letters", filter }, (payload) => {
      const row = payload.new as { sender_id: string };
      if (row.sender_id === userId) return;
      showBanner("New love letter 💌", "Your partner wrote you something. Open it?", "/");
    })
    .subscribe();
}

export function stopPartnerActivityWatch() {
  if (activityChannel) {
    supabase.removeChannel(activityChannel);
    activityChannel = null;
  }
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
