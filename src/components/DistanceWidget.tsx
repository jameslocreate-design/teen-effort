import { useEffect, useState } from "react";
import { Loader2, MapPinned, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const HOME_CITY_EVENT = "home-city-changed";
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Great-circle distance in miles (Haversine). */
export function haversineMiles(a: [number, number], b: [number, number]) {
  const R = 3958.8, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

interface CityResult { name: string; lat: number; lng: number }

/** Typed city search via Nominatim. Never touches device location. */
export const HomeCityPicker = ({ current, onSaved }: { current?: string | null; onSaved?: () => void }) => {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const search = async () => {
    if (q.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&featureType=city&q=${encodeURIComponent(q.trim())}`,
        { headers: { "Accept-Language": "en" } },
      );
      const data = (await res.json()) as { lat: string; lon: string; display_name: string; address?: Record<string, string> }[];
      const seen = new Set<string>();
      const list = data.map((d) => {
        const a = d.address ?? {};
        const city = a.city || a.town || a.village || a.municipality || a.county || d.display_name.split(",")[0];
        const region = a.state || a.region || "";
        const name = [city, region, a.country_code?.toUpperCase()].filter(Boolean).join(", ");
        return { name, lat: round2(+d.lat), lng: round2(+d.lon) };
      }).filter((r) => (seen.has(r.name) ? false : (seen.add(r.name), true)));
      setResults(list);
      if (!list.length) toast.error("No cities found");
    } catch {
      toast.error("City search failed — try again");
    } finally { setSearching(false); }
  };

  const save = async (patch: { home_city: string | null; home_lat: number | null; home_lng: number | null }) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(patch).eq("user_id", user.id);
    setSaving(false);
    if (error) return toast.error("Couldn't save your city");
    toast.success(patch.home_city ? `Home city set to ${patch.home_city}` : "Home city cleared");
    setResults([]); setQ("");
    window.dispatchEvent(new CustomEvent(HOME_CITY_EVENT));
    onSaved?.();
  };

  return (
    <div className="space-y-2">
      {current && (
        <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
          <span className="text-sm text-foreground font-sans truncate">{current}</span>
          <Button variant="ghost" size="sm" className="h-11 gap-1" disabled={saving}
            onClick={() => save({ home_city: null, home_lat: null, home_lng: null })}>
            <X className="h-4 w-4" /> Clear
          </Button>
        </div>
      )}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); search(); }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={current ? "Change city…" : "Type your city, e.g. Columbus"}
          className="h-11 rounded-xl text-base" aria-label="Home city" />
        <Button type="submit" variant="outline" className="h-11 rounded-xl" disabled={searching} aria-label="Search city">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>
      {results.length > 0 && (
        <ul className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {results.map((r) => (
            <li key={r.name}>
              <button type="button" disabled={saving} onClick={() => save({ home_city: r.name, home_lat: r.lat, home_lng: r.lng })}
                className="w-full text-left px-3 min-h-11 py-2 text-sm text-foreground font-sans hover:bg-accent/10">
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground font-sans">
        Only your city is shared with your partner. We never use your live location for this.
      </p>
    </div>
  );
};

interface Me { city: string | null; lat: number | null; lng: number | null }

const DistanceWidget = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [linked, setLinked] = useState(false);
  const [me, setMe] = useState<Me>({ city: null, lat: null, lng: null });
  const [partner, setPartner] = useState<Me & { name: string }>({ city: null, lat: null, lng: null, name: "your partner" });
  const [km, setKm] = useState(() => localStorage.getItem("distance-unit") === "km");
  const [editing, setEditing] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: mine } = await supabase.from("profiles").select("home_city,home_lat,home_lng").eq("user_id", user.id).maybeSingle();
    setMe({ city: mine?.home_city ?? null, lat: mine?.home_lat ?? null, lng: mine?.home_lng ?? null });
    const { data: link } = await supabase.from("partner_links").select("user1_id,user2_id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).eq("status", "accepted").maybeSingle();
    setLinked(!!link);
    if (link) {
      const pid = link.user1_id === user.id ? link.user2_id : link.user1_id;
      const { data: p } = await supabase.from("profiles").select("name,home_city,home_lat,home_lng").eq("user_id", pid).maybeSingle();
      setPartner({ name: p?.name || "your partner", city: p?.home_city ?? null, lat: p?.home_lat ?? null, lng: p?.home_lng ?? null });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener(HOME_CITY_EVENT, h);
    window.addEventListener("partner-link-changed", h);
    const vis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener(HOME_CITY_EVENT, h);
      window.removeEventListener("partner-link-changed", h);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [user?.id]);

  const toggleUnit = () => { const n = !km; setKm(n); localStorage.setItem("distance-unit", n ? "km" : "mi"); };

  if (loading) return <div className="rounded-xl border border-border bg-card p-4 animate-pulse"><div className="h-16" /></div>;
  if (!linked) return null; // "Link your partner" prompt already shown by Time Together

  const header = (subtitle: React.ReactNode, right?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center text-primary"><MapPinned className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">Distance</p>
          <div className="font-display text-lg text-foreground leading-tight">{subtitle}</div>
        </div>
      </div>
      {right}
    </div>
  );

  if (!me.city || editing) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        {header(me.city ? "Change your home city" : "Set your home city",
          editing && <Button variant="ghost" size="sm" className="h-11" onClick={() => setEditing(false)}>Done</Button>)}
        <HomeCityPicker current={me.city} onSaved={() => setEditing(false)} />
      </div>
    );
  }

  let body: React.ReactNode;
  if (!partner.city || partner.lat == null || me.lat == null) {
    body = <span className="text-base">Waiting for {partner.name} to set their city.</span>;
  } else {
    const miles = haversineMiles([Number(me.lat), Number(me.lng)], [Number(partner.lat), Number(partner.lng)]);
    const same = miles < 1 || me.city === partner.city;
    body = same ? "Same city 💕" : `About ${Math.round(km ? miles * 1.609344 : miles).toLocaleString()} ${km ? "km" : "miles"} apart`;
  }
  const bothSet = !!partner.city;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      {header(body, bothSet && (
        <Button variant="ghost" size="sm" className="h-11 font-sans" onClick={toggleUnit} aria-label="Toggle miles or kilometers">
          {km ? "km" : "mi"}
        </Button>
      ))}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground font-sans truncate">
          You: {me.city}{partner.city ? ` · ${partner.name}: ${partner.city}` : ""}
        </p>
        <Button variant="link" size="sm" className="h-11 px-0 text-xs" onClick={() => setEditing(true)}>Edit</Button>
      </div>
    </div>
  );
};

export default DistanceWidget;
