import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isNative, isIOS } from "@/lib/native";
import { syncDashboardWidgets, syncTimeTogetherWidget } from "@/lib/widgetSync";
import { haversineMiles, HOME_CITY_EVENT } from "@/components/DistanceWidget";
import { nextPlannedDate, preparationTasks, readPreparation, PREPARATION_EVENT } from "@/lib/date-preparation";

// One app-level owner keeps widgets fresh regardless of the current tab.
export default function NativeWidgetSync() {
  const { user } = useAuth();
  useEffect(() => {
    if (!isNative() || !isIOS()) return;
    let stopped = false;
    let revision = 0;
    // Clear old-account data before fetching the newly signed-in account.
    const cleared = Promise.all([syncDashboardWidgets(null), syncTimeTogetherWidget(null)]);
    const load = async () => {
      const current = ++revision;
      await cleared;
      if (!user) { await Promise.all([syncDashboardWidgets(null), syncTimeTogetherWidget(null)]); return; }
      const { data: link, error } = await supabase.from("partner_links").select("id,user1_id,user2_id,relationship_start_date")
        .eq("status", "accepted").or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
      if (error || stopped || current !== revision) return;
      if (!link) { await Promise.all([syncDashboardWidgets(null), syncTimeTogetherWidget(null)]); return; }
      const [profiles, calendar] = await Promise.all([
        supabase.from("profiles").select("user_id,home_city,home_lat,home_lng").in("user_id", [link.user1_id, link.user2_id]),
        supabase.from("calendar_entries").select("id,title,date,event_time").eq("partner_link_id", link.id),
      ]);
      if (stopped || current !== revision || profiles.error || calendar.error) return;
      const mine = profiles.data?.find(profile => profile.user_id === user.id);
      const partner = profiles.data?.find(profile => profile.user_id !== user.id);
      let distance: string | null = null;
      if (mine?.home_city && partner?.home_city && mine.home_lat != null && mine.home_lng != null && partner.home_lat != null && partner.home_lng != null) {
        const miles = haversineMiles([mine.home_lat, mine.home_lng], [partner.home_lat, partner.home_lng]);
        const km = localStorage.getItem("distance-unit") === "km";
        distance = miles < 1 || mine.home_city === partner.home_city ? "Same city" : `About ${Math.round(km ? miles * 1.609344 : miles).toLocaleString()} ${km ? "km" : "miles"} apart`;
      }
      const entries = calendar.data ?? [];
      const next = nextPlannedDate(entries);
      await Promise.all([
        syncTimeTogetherWidget(link.relationship_start_date),
        syncDashboardWidgets({ distance, dates: entries.map(entry => entry.date), preparation: next ? {
          title: next.title, date: next.date, eventTime: next.event_time,
          tasks: preparationTasks(next, readPreparation(user.id, next.id)).map(task => ({ label: task.label, at: task.at ? Date.parse(task.at) : null, completed: task.completed })),
        } : null }),
      ]);
    };
    const refresh = () => { void load().catch(() => console.warn("Widget data refresh failed")); };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    const events = [HOME_CITY_EVENT, PREPARATION_EVENT, "partner-link-changed", "profile-updated", "calendar-updated", "distance-unit-changed"];
    events.forEach(event => window.addEventListener(event, refresh));
    document.addEventListener("visibilitychange", visible);
    const timer = window.setInterval(refresh, 60_000);
    const channel = user ? supabase.channel(`native-widgets-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_entries" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_links" }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, refresh).subscribe() : null;
    return () => {
      stopped = true; revision++;
      events.forEach(event => window.removeEventListener(event, refresh));
      document.removeEventListener("visibilitychange", visible);
      window.clearInterval(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [user?.id]);
  return null;
}