import { supabase } from "@/integrations/supabase/client";
import { getCurrentCoords } from "@/lib/geo";

export interface DateIdea {
  title: string;
  description: string;
  estimated_cost: string;
  duration: string;
  vibe: string;
  distance_miles: string;
  rating?: number;
  review_count?: number;
  url?: string;
  /** True when no live venue data was available — idea is an activity type in the user's own city, not a verified place. */
  fallback?: boolean;
}

export interface DateFilters {
  cost: string[] | null;
  location: string[] | null;
  activity: string[] | null;
  distance: string[] | null;
  timeRange: string | null;
  cuisine: string[] | null;
  latitude: number | null;
  longitude: number | null;
  funActivity: string[] | null;
  mood: string[] | null;
}

export class UsageLimitError extends Error {
  limit: number;
  feature: string;
  constructor(message: string, feature: string, limit: number) {
    super(message);
    this.name = "UsageLimitError";
    this.feature = feature;
    this.limit = limit;
  }
}

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export async function generateDateIdeas(filters: DateFilters): Promise<DateIdea[]> {
  const includeEating = (filters.activity || []).includes("Eating out");
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Every generation refreshes position; apply privacy before either outbound
  // geocoder or venue lookup, including Smart Recommendations and Swipe Dates.
  let coords;
  try { coords = await getCurrentCoords({ fresh: true, timeout: 12000 }); }
  catch { throw new Error("Couldn't refresh your location. Allow location access and try again."); }
  let approximate = false;
  if (session?.user) {
    const { data, error } = await supabase.from("profiles").select("privacy_settings").eq("user_id", session.user.id).maybeSingle();
    const privacy = data?.privacy_settings;
    approximate = !!error || !privacy || (typeof privacy === "object" && !Array.isArray(privacy) && privacy.location_precision === "zip");
  }
  const round = (value: number) => approximate ? Math.round(value * 100) / 100 : value;
  filters = { ...filters, latitude: round(coords.latitude), longitude: round(coords.longitude) };

  // Resolve the city on the device as a backup, so the server never has to guess.
  let city: string | undefined;
  if (filters.latitude != null && filters.longitude != null) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${filters.latitude}&lon=${filters.longitude}&zoom=10`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (r.ok) {
        const a = (await r.json()).address || {};
        city = [a.city || a.town || a.village || a.county, a.state].filter(Boolean).join(", ") || undefined;
      }
    } catch { /* server will try too */ }
  }

  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...filters, includeEating, city }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    if (resp.status === 403 && data?.error === "limit_reached") {
      throw new UsageLimitError(data.message || "Free limit reached", data.feature || "date_ideas", data.limit ?? 5);
    }
    throw new Error(data.error || `Request failed (${resp.status})`);
  }

  const data = await resp.json();
  return data.ideas || [];
}
