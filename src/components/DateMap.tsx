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
  latitude: number | null;
  longitude: number | null;
}

const DateMap = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DateEntry[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

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
        .select("id, title, date, vibe, user_rating, yelp_url, yelp_rating, description, estimated_cost, latitude, longitude")
        .eq("partner_link_id", link.id)
        .order("date", { ascending: false });

      setEntries((data as DateEntry[]) || []);
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

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; markersRef.current = null; };
  }, [userLocation]);

  // Add markers for entries with coordinates
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;
    markersRef.current.clearLayers();

    const geoEntries = entries.filter(e => e.latitude && e.longitude);

    geoEntries.forEach((entry) => {
      const color = vibeColors[entry.vibe || ""] || "#6b7280";
      const icon = L.divIcon({
        className: "custom-date-marker",
        html: `<div style="
          width: 28px; height: 28px; border-radius: 50%; 
          background: ${color}; border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 12px; font-weight: bold;
        ">${entry.user_rating || "♥"}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const popupContent = `
        <div style="min-width: 160px;">
          <strong>${entry.title}</strong><br/>
          <span style="color: #666; font-size: 12px;">${entry.date}</span>
          ${entry.vibe ? `<br/><span style="font-size: 11px;">✨ ${entry.vibe}</span>` : ""}
          ${entry.estimated_cost ? `<br/><span style="font-size: 11px;">💰 ${entry.estimated_cost}</span>` : ""}
          ${entry.yelp_url ? `<br/><a href="${entry.yelp_url}" target="_blank" style="font-size: 11px; color: #3b82f6;">View on Yelp →</a>` : ""}
        </div>
      `;

      L.marker([entry.latitude!, entry.longitude!], { icon })
        .addTo(markersRef.current!)
        .bindPopup(popupContent);
    });

    // Fit bounds if there are geo entries
    if (geoEntries.length > 0 && mapRef.current) {
      const allPoints: [number, number][] = geoEntries.map(e => [e.latitude!, e.longitude!]);
      if (userLocation) allPoints.push(userLocation);
      const bounds = L.latLngBounds(allPoints.map(p => L.latLng(p[0], p[1])));
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [entries, userLocation]);

  if (!userLocation) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 p-8 text-center">
        <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
        <p className="text-sm text-muted-foreground font-sans">Loading map...</p>
      </div>
    );
  }

  const geoCount = entries.filter(e => e.latitude && e.longitude).length;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70 font-sans">Explore</p>
        <h2 className="text-2xl font-display font-semibold text-foreground">Date Map</h2>
        <p className="text-sm text-muted-foreground font-sans">
          Your date history, visualized geographically.
          {geoCount > 0 && ` ${geoCount} date${geoCount !== 1 ? "s" : ""} pinned.`}
        </p>
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
                  <p className="text-xs text-muted-foreground font-sans">
                    {entry.date}
                    {!entry.latitude && <span className="ml-1 text-muted-foreground/50">(no pin)</span>}
                  </p>
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
