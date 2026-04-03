import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Dices, Trash2, Bookmark, Clock, DollarSign, Sparkles, Star, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { DateIdea } from "@/lib/date-planner";

interface SavedIdea {
  id: string;
  title: string;
  description: string | null;
  estimated_cost: string | null;
  duration: string | null;
  vibe: string | null;
  distance_miles: string | null;
  yelp_rating: number | null;
  yelp_review_count: number | null;
  yelp_url: string | null;
  created_at: string;
}

interface SavedDateIdeasProps {
  onAddToCalendar: (idea: DateIdea, index: number) => void;
  refreshKey: number;
}

const vibeColors: Record<string, string> = {
  Romantic: "bg-pink-500/15 text-pink-400",
  Adventurous: "bg-orange-500/15 text-orange-400",
  Cozy: "bg-amber-500/15 text-amber-400",
  Creative: "bg-violet-500/15 text-violet-400",
  Relaxed: "bg-sky-500/15 text-sky-400",
  Fun: "bg-emerald-500/15 text-emerald-400",
};

const SavedDateIdeas = ({ onAddToCalendar, refreshKey }: SavedDateIdeasProps) => {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<SavedIdea[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_date_ideas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setIdeas(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSaved(); }, [fetchSaved, refreshKey]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("saved_date_ideas").delete().eq("id", id);
    if (error) toast.error("Failed to remove");
    else {
      setIdeas(prev => prev.filter(i => i.id !== id));
      toast.success("Removed from saved ideas");
    }
  };

  const toDateIdea = (saved: SavedIdea): DateIdea => ({
    title: saved.title,
    description: saved.description || "",
    estimated_cost: saved.estimated_cost || "",
    duration: saved.duration || "",
    vibe: saved.vibe || "",
    distance_miles: saved.distance_miles || "",
    rating: saved.yelp_rating ?? undefined,
    review_count: saved.yelp_review_count ?? undefined,
    url: saved.yelp_url ?? undefined,
  });

  const handleAddToRoulette = async (saved: SavedIdea) => {
    if (!user) return;
    const { error } = await supabase.from("roulette_date_ideas").insert({
      user_id: user.id,
      title: saved.title,
      description: saved.description,
      estimated_cost: saved.estimated_cost,
      duration: saved.duration,
      vibe: saved.vibe,
      yelp_url: saved.yelp_url,
      yelp_rating: saved.yelp_rating,
      yelp_review_count: saved.yelp_review_count,
    });
    if (error) toast.error("Failed to add to roulette");
    else {
      toast.success(`"${saved.title}" added to the roulette wheel!`);
      window.dispatchEvent(new Event("roulette-updated"));
    }
  };

  if (loading || ideas.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bookmark className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground font-sans">
          Saved for Later ({ideas.length})
        </h2>
      </div>

      {ideas.map((saved, i) => {
        const vibeClass = vibeColors[saved.vibe || ""] || "bg-primary/15 text-primary";
        return (
          <div
            key={saved.id}
            className="rounded-2xl border border-border bg-card p-5 space-y-3 transition-all duration-300 hover:border-primary/30 hover:glow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground leading-snug">{saved.title}</h3>
                {saved.yelp_rating && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="text-sm font-medium">{saved.yelp_rating}</span>
                    </div>
                    {saved.yelp_review_count && (
                      <span className="text-xs text-muted-foreground">({saved.yelp_review_count} reviews)</span>
                    )}
                  </div>
                )}
              </div>
              {saved.vibe && (
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${vibeClass}`}>
                  {saved.vibe}
                </span>
              )}
            </div>

            {saved.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{saved.description}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              {saved.estimated_cost && (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-primary/70" />{saved.estimated_cost}
                </span>
              )}
              {saved.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary/70" />{saved.duration}
                </span>
              )}
              {saved.vibe && (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary/70" />{saved.vibe}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddToCalendar(toDateIdea(saved), 1000 + i)}
                className="rounded-lg text-xs gap-1.5"
              >
                <CalendarPlus className="h-3.5 w-3.5" /> Add to Calendar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddToRoulette(saved)}
                className="rounded-lg text-xs gap-1.5"
              >
                <Dices className="h-3.5 w-3.5" /> Add to Roulette
              </Button>
              {saved.yelp_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => window.open(saved.yelp_url!, "_blank")}
                >
                  View on Yelp <ExternalLink className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(saved.id)}
                className="rounded-lg text-xs gap-1.5 text-destructive hover:text-destructive ml-auto"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SavedDateIdeas;