import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dices, Loader2, Sparkles, CalendarPlus } from "lucide-react";
import { generateDateIdeas, type DateIdea } from "@/lib/date-planner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

const WHEEL_COLORS = [
  "hsl(160, 84%, 44%)",
  "hsl(220, 16%, 14%)",
  "hsl(160, 60%, 30%)",
  "hsl(220, 18%, 8%)",
  "hsl(160, 84%, 34%)",
  "hsl(220, 14%, 18%)",
];

const DateRoulette = () => {
  const { user } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<DateIdea[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [partnerLinkId, setPartnerLinkId] = useState<string | null>(null);
  const wheelRef = useRef<SVGSVGElement>(null);

  const fetchPartnerLink = async () => {
    if (!user) return null;
    const { data } = await supabase
      .from("partner_links").select("id").eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
    if (data) setPartnerLinkId(data.id);
    return data?.id || null;
  };

  const handleSpin = async () => {
    if (ideas.length === 0) {
      setLoading(true);
      try {
        const generated = await generateDateIdeas({
          cost: null, location: null, activity: null, distance: null,
          timeRange: null, cuisine: null, latitude: null, longitude: null, funActivity: null, mood: null,
        });
        if (generated.length === 0) {
          toast.error("No ideas generated. Try again!");
          setLoading(false);
          return;
        }
        setIdeas(generated.slice(0, 6));
        setLoading(false);
        spinWheel(generated.slice(0, 6));
      } catch {
        toast.error("Failed to generate ideas");
        setLoading(false);
      }
    } else {
      spinWheel(ideas);
    }
  };

  const spinWheel = (currentIdeas: DateIdea[]) => {
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
      description: idea.description, estimated_cost: idea.estimated_cost,
      duration: idea.duration, vibe: idea.vibe,
      yelp_url: idea.url || null, yelp_rating: idea.rating || null,
      yelp_review_count: idea.review_count || null,
    });
    if (error) toast.error("Failed to save");
    else toast.success(`"${idea.title}" added to calendar for tomorrow!`);
  };

  const handleRespin = () => {
    setIdeas([]);
    setSelectedIndex(null);
    setRotation(0);
  };

  const count = ideas.length || 6;
  const sliceAngle = 360 / count;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
          <Dices className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Date Roulette</h2>
        <p className="text-sm text-muted-foreground">Can't decide? Let fate choose your next date!</p>
      </div>

      {/* Wheel */}
      <div className="relative flex items-center justify-center">
        {/* Pointer */}
        <div className="absolute top-0 z-10 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary" />

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
          <circle cx="150" cy="150" r="20" fill="hsl(220, 20%, 4%)" stroke="hsl(160, 84%, 44%)" strokeWidth="3" />
          <text x="150" y="150" textAnchor="middle" dominantBaseline="middle" fill="hsl(160, 84%, 44%)" fontSize="10" fontWeight="bold">
            {spinning ? "🎰" : "GO"}
          </text>
        </svg>
      </div>

      {/* Result card */}
      {selectedIndex !== null && !spinning && ideas[selectedIndex] && (
        <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">{ideas[selectedIndex].title}</h3>
          </div>
          {ideas[selectedIndex].description && (
            <p className="text-sm text-muted-foreground">{ideas[selectedIndex].description}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {ideas[selectedIndex].estimated_cost && <span>💰 {ideas[selectedIndex].estimated_cost}</span>}
            {ideas[selectedIndex].duration && <span>⏱️ {ideas[selectedIndex].duration}</span>}
            {ideas[selectedIndex].vibe && <span>✨ {ideas[selectedIndex].vibe}</span>}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddToCalendar} size="sm" className="gap-1.5">
              <CalendarPlus className="h-3.5 w-3.5" /> Add to Calendar
            </Button>
            <Button variant="outline" size="sm" onClick={handleRespin}>
              <Dices className="h-3.5 w-3.5" /> Spin Again
            </Button>
          </div>
        </div>
      )}

      {/* Spin button */}
      <Button
        onClick={handleSpin}
        disabled={spinning || loading}
        size="lg"
        className="w-full rounded-xl text-base font-semibold h-12"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Generating ideas...</>
        ) : spinning ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Spinning...</>
        ) : ideas.length > 0 ? (
          <><Dices className="h-4 w-4" /> Spin Again</>
        ) : (
          <><Dices className="h-4 w-4" /> Spin the Wheel!</>
        )}
      </Button>
    </div>
  );
};

export default DateRoulette;
