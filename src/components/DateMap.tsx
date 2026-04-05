import { useState, useEffect, useRef } from "react";
import { MapPin, Star, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const vibeColors: Record<string, string> = {
  Romantic: "#e11d48",
  Adventurous: "#f97316",
  Cozy: "#a855f7",
  Creative: "#3b82f6",
  Relaxed: "#22c55e",
  Fun: "#eab308",
};

interface DateEntry {
  id: string;
  title: string;
  date: string;
  vibe: string | null;
  user_rating: number | null;
  yelp_url: string | null;
  yelp_rating: number | null;
  description: string | null;
  estimated_cost: string | null;
}

const DateMap = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DateEntry[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => setUserLocation([39.8283, -98.5795])
    );
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: link } = await supabase
        .from("partner_links").select("id").eq("status", "accepted")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
      if (!link) { setLoading(false); return; }

      const { data } = await supabase
        .from("calendar_entries")
        .select("id, title, date, vibe, user_rating, yelp_url, yelp_rating, description, estimated_cost")
        .eq("partner_link_id", link.id)
        .order("date", { ascending: false });

      setEntries(data || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // Initialize map
  useEffect(() => {
    if (!userLocation || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(userLocation, 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    // User location marker
    L.circleMarker(userLocation, {
      radius: 8, fillColor: "#e11d48", fillOpacity: 1, color: "#fff", weight: 3,
    }).addTo(map).bindPopup("You are here");

    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, [userLocation]);

  if (!userLocation) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 p-8 text-center">
        <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
        <p className="text-sm text-muted-foreground font-sans">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70 font-sans">Explore</p>
        <h2 className="text-2xl font-display font-semibold text-foreground">Date Map</h2>
        <p className="text-sm text-muted-foreground font-sans">Your date history, visualized geographically.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(vibeColors).map(([vibe, color]) => (
          <div key={vibe} className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full" style={{ background: color }} />
            <span className="text-xs text-muted-foreground font-sans">{vibe}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden border border-border" style={{ height: 400 }}>
        <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />
      </div>

      {entries.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground font-sans">{entries.length} dates logged</h3>
          <div className="grid gap-2">
            {entries.slice(0, 6).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-3">
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ background: vibeColors[entry.vibe || ""] || "hsl(var(--muted-foreground))" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate font-sans">{entry.title}</p>
                  <p className="text-xs text-muted-foreground font-sans">{entry.date}</p>
                </div>
                {entry.user_rating && (
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs text-muted-foreground font-sans">{entry.user_rating}</span>
                  </div>
                )}
                {entry.yelp_url && (
                  <a href={entry.yelp_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground font-sans">No dates yet — plan your first one!</p>
        </div>
      )}
    </div>
  );
};

export default DateMap;
