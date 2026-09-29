import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Gift, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Profile = { name: string; partner: string; birthYear: string };
type Idea = { title: string; description: string; estimated_cost?: string; price_range?: string; url?: string };

const DAILY_LIMIT = 20;
const TIERS = ["Free", "Tier 1", "Tier 2"];
const today = () => new Date().toLocaleDateString("en-CA");

const read = <T,>(k: string, d: T): T => {
  try { return JSON.parse(localStorage.getItem(k) || "") ?? d; } catch { return d; }
};

async function callIdeas(fn: "chat" | "gift-ideas", body: object): Promise<Idea[]> {
  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      "x-demo-mode": "true",
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || `Request failed (${resp.status})`);
  return data.ideas || [];
}

const Demo = () => {
  const [profile, setProfile] = useState<Profile | null>(() => read("demo-profile", null));
  const [form, setForm] = useState<Profile>({ name: "", partner: "", birthYear: "" });
  const [tier, setTier] = useState<number>(() => read("demo-tier", 0));
  const [usage, setUsage] = useState(() => {
    const u = read("demo-ai-usage", { day: today(), count: 0 });
    return u.day === today() ? u : { day: today(), count: 0 };
  });
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => { m.remove(); };
  }, []);

  const saveProfile = () => {
    if (!form.name.trim()) return;
    localStorage.setItem("demo-profile", JSON.stringify(form));
    setProfile(form);
  };

  const pickTier = (t: number) => { setTier(t); localStorage.setItem("demo-tier", JSON.stringify(t)); };

  const generate = async (kind: "date" | "gift") => {
    if (usage.count >= DAILY_LIMIT) {
      setError("You've reached today's demo limit of 20 ideas. It resets tomorrow.");
      return;
    }
    setLoading(kind); setError(null);
    try {
      const result = kind === "date"
        ? await callIdeas("chat", { cost: null, location: null, activity: null, distance: null, timeRange: null, cuisine: null, latitude: null, longitude: null, funActivity: null, includeEating: false })
        : await callIdeas("gift-ideas", { cost: null, personalization: profile?.partner || null, event: null });
      setIdeas(result);
      const next = { day: today(), count: usage.count + 1 };
      localStorage.setItem("demo-ai-usage", JSON.stringify(next));
      setUsage(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(null); }
  };

  const reset = () => {
    ["demo-profile", "demo-tier", "demo-ai-usage"].forEach((k) => localStorage.removeItem(k));
    setProfile(null); setIdeas([]); setTier(0);
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl">Teen Effort</h1>
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">Demo build</span>
        </div>

        {!profile ? (
          <Card className="space-y-3 p-5">
            <h2 className="font-display text-xl">Set up your demo profile</h2>
            <p className="text-sm text-muted-foreground">Saved only on this device.</p>
            <Input className="h-11 text-base" placeholder="Your first name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input className="h-11 text-base" placeholder="Partner's first name" value={form.partner} onChange={(e) => setForm({ ...form, partner: e.target.value })} />
            <Input className="h-11 text-base" inputMode="numeric" placeholder="Birth year" value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value })} />
            <Button className="h-11 w-full" onClick={saveProfile} disabled={!form.name.trim()}>Start demo</Button>
          </Card>
        ) : (
          <>
            <p className="text-muted-foreground">Hi {profile.name}{profile.partner ? ` & ${profile.partner}` : ""}.</p>

            <Card className="space-y-2 p-4">
              <p className="text-sm font-medium">Demo tier</p>
              <div className="grid grid-cols-3 gap-2">
                {TIERS.map((t, i) => (
                  <Button key={t} variant={tier === i ? "default" : "outline"} className="h-11" onClick={() => pickTier(i)}>{t}</Button>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button className="h-14" onClick={() => generate("date")} disabled={!!loading}>
                <Heart className="mr-2 h-4 w-4" />{loading === "date" ? "Thinking…" : "Date ideas"}
              </Button>
              <Button className="h-14" variant="secondary" onClick={() => generate("gift")} disabled={!!loading}>
                <Gift className="mr-2 h-4 w-4" />{loading === "gift" ? "Thinking…" : "Gift ideas"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{DAILY_LIMIT - usage.count} of {DAILY_LIMIT} demo ideas left today</p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-3">
              {ideas.map((idea, i) => (
                <Card key={i} className="p-4">
                  <h3 className="flex items-start gap-2 font-display text-lg"><Sparkles className="mt-1 h-4 w-4 shrink-0 text-primary" />{idea.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{idea.description}</p>
                  {(idea.estimated_cost || idea.price_range) && <p className="mt-2 text-xs">{idea.estimated_cost || idea.price_range}</p>}
                </Card>
              ))}
            </div>

            <Button variant="ghost" className="h-11" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />Reset demo profile</Button>
          </>
        )}

        <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
          This is a demo build. Data stays on this device and paid tiers are simulated.{" "}
          <Link to="/privacy" className="underline">Privacy</Link> · <Link to="/terms" className="underline">Terms</Link>
        </footer>
      </div>
    </div>
  );
};

export default Demo;
