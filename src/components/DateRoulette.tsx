import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dices, Loader2, Sparkles, CalendarPlus, Trash2, Plus } from "lucide-react";
import type { DateIdea } from "@/lib/date-planner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

const WHEEL_COLORS = [
  "hsl(18, 45%, 55%)",
  "hsl(20, 8%, 12%)",
  "hsl(18, 35%, 40%)",
  "hsl(25, 12%, 18%)",
  "hsl(18, 45%, 48%)",
  "hsl(20, 6%, 15%)",
];

interface RouletteIdea {
  id: string;
  title: string;
  description: string | null;
  estimated_cost: string | null;
  duration: string | null;
  vibe: string | null;
  yelp_url: string | null;
  yelp_rating: number | null;
  yelp_review_count: number | null;
}

const DateRoulette = () => {
  const { user } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [ideas, setIdeas] = useState<RouletteIdea[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [partnerLinkId, setPartnerLinkId] = useState<string | null>(null);
  const wheelRef = useRef<SVGSVGElement>(null);
  const [newTitle, setNewTitle] = useState("");

  const fetchIdeas = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("roulette_date_ideas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setIdeas(data || []);
  }, [user]);

  const fetchPartnerLink = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from("partner_links").select("id").eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
    if (data) setPartnerLinkId(data.id);
    return data?.id || null;
  }, [user]);

  useEffect(() => { fetchIdeas(); fetchPartnerLink(); }, [fetchIdeas, fetchPartnerLink]);

  // Listen for external additions (from SavedDateIdeas)
  useEffect(() => {
    const handler = () => fetchIdeas();
    window.addEventListener("roulette-updated", handler);
    return () => window.removeEventListener("roulette-updated", handler);
  }, [fetchIdeas]);

  const handleAddManual = async () => {
    if (!newTitle.trim() || !user) return;
    const { error } = await supabase.from("roulette_date_ideas").insert({
      user_id: user.id, title: newTitle.trim(),
    });
    if (error) toast.error("Failed to add");
    else {
      setNewTitle("");
      fetchIdeas();
      toast.success("Added to the wheel!");
    }
  };

  const handleRemove = async (id: string) => {
    await supabase.from("roulette_date_ideas").delete().eq("id", id);
    setIdeas(prev => prev.filter(i => i.id !== id));
    setSelectedIndex(null);
    setRotation(0);
  };

  const handleSpin = () => {
    if (ideas.length < 2) { toast.error("Add at least 2 ideas to spin!"); return; }
    spinWheel(ideas);
  };

  const spinWheel = (currentIdeas: RouletteIdea[]) => {
    setSpinning(true);
    setSelectedIndex(null);
    const spins = 5 + Math.random() * 5;
    const winIndex = Math.floor(Math.random() * currentIdeas.length);
    const sliceAngle = 360 / currentIdeas.length;
    const targetAngle = 360 * spins + (360 - (winIndex * sliceAngle + sliceAngle / 2));
    setRotation(targetAngle);

    setTimeout(() => {
      setSpinning(false);
      setSelectedIndex(winIndex);
      toast.success(`🎉 "${currentIdeas[winIndex].title}" wins!`);
    }, 4000);
  };

  const handleAddToCalendar = async () => {
    if (selectedIndex === null || !user) return;
    let linkId = partnerLinkId;
    if (!linkId) linkId = await fetchPartnerLink();
    if (!linkId) { toast.error("Link with a partner first!"); return; }

    const idea = ideas[selectedIndex];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { error } = await supabase.from("calendar_entries").insert({
      partner_link_id: linkId, added_by: user.id,
      date: format(tomorrow, "yyyy-MM-dd"), title: idea.title,
      description: idea.description || null, estimated_cost: idea.estimated_cost || null,
      duration: idea.duration || null, vibe: idea.vibe || null,
      yelp_url: idea.yelp_url || null, yelp_rating: idea.yelp_rating || null,
      yelp_review_count: idea.yelp_review_count || null,
    });
    if (error) toast.error("Failed to save");
    else toast.success(`"${idea.title}" added to calendar for tomorrow!`);
  };

  const count = ideas.length || 6;
  const sliceAngle = 360 / count;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center glow-md">
          <Dices className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-display font-semibold text-foreground">Date Roulette</h2>
        <p className="text-sm text-muted-foreground font-sans">Add your date ideas, then let fate decide!</p>
      </div>

      {/* Add idea input */}
      <div className="flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddManual()}
          placeholder="Type a date idea to add..."
          className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-sans"
        />
        <Button onClick={handleAddManual} disabled={!newTitle.trim()} className="rounded-xl h-12 px-5 gap-1.5">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {/* Idea list */}
      {ideas.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70 font-sans">
            On the Wheel ({ideas.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {ideas.map((idea) => (
              <span
                key={idea.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary font-sans"
              >
                {idea.title}
                <button onClick={() => handleRemove(idea.id)} className="text-primary/50 hover:text-destructive transition-colors">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {ideas.length < 2 && (
        <p className="text-center text-sm text-muted-foreground font-sans py-4">
          Add at least 2 date ideas to spin the wheel!
        </p>
      )}

      {/* Wheel */}
      {ideas.length >= 2 && (
      <div className="relative flex items-center justify-center py-2">
        {/* Pointer */}
        <div className="absolute top-2 z-10 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary" />

        <svg
          ref={wheelRef}
          viewBox="0 0 300 300"
          className="w-72 h-72 drop-shadow-lg"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
          }}
        >
          {Array.from({ length: count }).map((_, i) => {
            const startAngle = (i * sliceAngle * Math.PI) / 180;
            const endAngle = ((i + 1) * sliceAngle * Math.PI) / 180;
            const x1 = 150 + 140 * Math.cos(startAngle);
            const y1 = 150 + 140 * Math.sin(startAngle);
            const x2 = 150 + 140 * Math.cos(endAngle);
            const y2 = 150 + 140 * Math.sin(endAngle);
            const largeArc = sliceAngle > 180 ? 1 : 0;
            const midAngle = (startAngle + endAngle) / 2;
            const labelX = 150 + 85 * Math.cos(midAngle);
            const labelY = 150 + 85 * Math.sin(midAngle);
            const labelRotation = (midAngle * 180) / Math.PI;

            return (
              <g key={i}>
                <path
                  d={`M150,150 L${x1},${y1} A140,140 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={WHEEL_COLORS[i % WHEEL_COLORS.length]}
                  stroke="hsl(220, 20%, 4%)"
                  strokeWidth="2"
                  className={selectedIndex === i && !spinning ? "opacity-100" : "opacity-80"}
                />
                {ideas[i] && (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="hsl(210, 20%, 92%)"
                    fontSize="9"
                    fontWeight="600"
                    transform={`rotate(${labelRotation}, ${labelX}, ${labelY})`}
                  >
                    {ideas[i].title.length > 14 ? ideas[i].title.slice(0, 14) + "…" : ideas[i].title}
                  </text>
                )}
              </g>
            );
          })}
          <circle cx="150" cy="150" r="20" fill="hsl(20, 8%, 5%)" stroke="hsl(18, 45%, 55%)" strokeWidth="3" />
          <text x="150" y="150" textAnchor="middle" dominantBaseline="middle" fill="hsl(18, 45%, 55%)" fontSize="10" fontWeight="bold">
            {spinning ? "🎰" : "GO"}
          </text>
        </svg>
      </div>
      )}

      {/* Result card */}
      {selectedIndex !== null && !spinning && ideas[selectedIndex] && (
        <div className="rounded-2xl border border-primary/30 bg-card p-5 space-y-3 animate-fade-in-up glow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold text-foreground">{ideas[selectedIndex].title}</h3>
          </div>
          {ideas[selectedIndex].description && (
            <p className="text-sm text-muted-foreground font-sans">{ideas[selectedIndex].description}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground font-sans">
            {ideas[selectedIndex].estimated_cost && <span>💰 {ideas[selectedIndex].estimated_cost}</span>}
            {ideas[selectedIndex].duration && <span>⏱️ {ideas[selectedIndex].duration}</span>}
            {ideas[selectedIndex].vibe && <span>✨ {ideas[selectedIndex].vibe}</span>}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddToCalendar} size="sm" className="gap-1.5 rounded-xl">
              <CalendarPlus className="h-3.5 w-3.5" /> Add to Calendar
            </Button>
            <Button variant="outline" size="sm" onClick={handleSpin} className="rounded-xl">
              <Dices className="h-3.5 w-3.5" /> Spin Again
            </Button>
          </div>
        </div>
      )}

      {/* Spin button */}
      {ideas.length >= 2 && (
      <Button
        onClick={handleSpin}
        disabled={spinning}
        size="lg"
        className="w-full rounded-2xl text-base font-semibold h-14 font-sans"
      >
        {spinning ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Spinning...</>
        ) : (
          <><Dices className="h-4 w-4" /> Spin the Wheel!</>
        )}
      </Button>
      )}
    </div>
  );
};

export default DateRoulette;
