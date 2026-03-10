import { useState, useEffect, useCallback } from "react";
import { Loader2, Sparkles, Gift, Bookmark, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FilterGroup from "@/components/FilterGroup";
import GiftIdeaCard from "@/components/GiftIdeaCard";
import { generateGiftIdeas, type GiftFilters, type GiftIdea } from "@/lib/gift-planner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const costOptions = [
  { value: "Under $15", label: "Under $15", icon: "🪙" },
  { value: "$15-50", label: "$15-50", icon: "💵" },
  { value: "$50-100", label: "$50-100", icon: "💰" },
  { value: "$100+", label: "$100+", icon: "💎" },
];

const eventOptions = [
  { value: "Birthday", label: "Birthday", icon: "🎂" },
  { value: "Anniversary", label: "Anniversary", icon: "💍" },
  { value: "Valentine's Day", label: "Valentine's", icon: "💝" },
  { value: "Christmas / Holidays", label: "Holidays", icon: "🎄" },
  { value: "Just Because", label: "Just Because", icon: "💕" },
  { value: "Dances (Prom, Homecoming, Winter Formal)", label: "Dances", icon: "💃" },
];

interface SavedGift {
  id: string;
  title: string;
  description: string | null;
  estimated_cost: string | null;
  where_to_buy: string | null;
  personalization_tip: string | null;
  vibe: string | null;
  created_at: string;
}

const GiftPlanner = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<GiftFilters>({
    cost: null,
    personalization: null,
    event: null,
  });

  const [ideas, setIdeas] = useState<GiftIdea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [savedGifts, setSavedGifts] = useState<SavedGift[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSavedGifts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_gifts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setSavedGifts(data);
  }, [user]);

  useEffect(() => { fetchSavedGifts(); }, [fetchSavedGifts]);

  const updateFilter = (key: keyof GiftFilters) => (value: string | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const hasAnyFilter = filters.cost || filters.personalization || filters.event;

  const handleGenerate = async () => {
    setIsLoading(true);
    setHasGenerated(true);
    try {
      const result = await generateGiftIdeas(filters);
      setIdeas(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate ideas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGift = async (idea: GiftIdea, index: number) => {
    if (!user) return;
    setSavingIndex(index);
    const { error } = await supabase.from("saved_gifts").insert({
      user_id: user.id,
      title: idea.title,
      description: idea.description,
      estimated_cost: idea.estimated_cost,
      where_to_buy: idea.where_to_buy,
      personalization_tip: idea.personalization_tip,
      vibe: idea.vibe,
    });
    if (error) {
      toast.error("Failed to save gift");
    } else {
      toast.success(`"${idea.title}" saved!`);
      fetchSavedGifts();
    }
    setSavingIndex(null);
  };

  const handleDeleteGift = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("saved_gifts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete gift");
    } else {
      setSavedGifts((prev) => prev.filter((g) => g.id !== id));
      toast.success("Gift removed");
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
          <Gift className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Gift Planner</h2>
          <p className="text-xs text-muted-foreground">Find the perfect gift for your partner</p>
        </div>
      </div>

      <div className="space-y-6">
        <FilterGroup label="Budget" options={costOptions} selected={filters.cost} onSelect={updateFilter("cost")} />
        <FilterGroup label="Event / Season" options={eventOptions} selected={filters.event} onSelect={updateFilter("event")} />

        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Personalization
          </h3>
          <Textarea
            placeholder="Tell us about your partner's interests — favorite band, movie, hobby, sport, inside jokes, etc. The more detail the better!"
            value={filters.personalization || ""}
            onChange={(e) => updateFilter("personalization")(e.target.value || null)}
            className="rounded-xl border-border bg-secondary/40 text-sm min-h-[80px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            e.g. "She loves Taylor Swift, hiking, and watercolor painting" or "He's obsessed with the Lakers and cooking Italian food"
          </p>
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={isLoading} size="lg" className="w-full rounded-xl text-base font-semibold h-12">
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Finding gifts...
          </>
        ) : (
          <>
            <Gift className="h-4 w-4" />
            {hasAnyFilter ? "Generate Gift Ideas" : "Surprise Me"}
          </>
        )}
      </Button>

      {hasGenerated && !isLoading && ideas.length > 0 && (
        <div className="space-y-4 pb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Gift Ideas
          </h2>
          {ideas.map((idea, i) => (
            <div key={i} className="relative">
              <GiftIdeaCard idea={idea} index={i} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveGift(idea, i)}
                disabled={savingIndex === i}
                className="absolute top-3 right-3 rounded-lg text-xs"
              >
                <Bookmark className="h-3.5 w-3.5" />
                {savingIndex === i ? "Saving..." : "Save"}
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={handleGenerate} className="w-full rounded-xl">
            <Sparkles className="h-4 w-4" />
            Generate More
          </Button>
        </div>
      )}

      {hasGenerated && !isLoading && ideas.length === 0 && (
        <p className="text-center py-8 text-muted-foreground">No ideas generated. Try different filters.</p>
      )}

      {/* Saved Gifts Section */}
      {savedGifts.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Bookmark className="h-3.5 w-3.5" />
            Saved Gifts ({savedGifts.length})
          </h2>
          <p className="text-xs text-muted-foreground">Only you can see these — keep the surprise!</p>
          {savedGifts.map((gift) => (
            <div key={gift.id} className="group rounded-2xl border border-border bg-card p-5 space-y-3 transition-all duration-300 hover:border-primary/30">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-foreground leading-snug">{gift.title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  {gift.vibe && (
                    <span className="rounded-full bg-primary/15 text-primary px-2.5 py-1 text-xs font-medium">
                      {gift.vibe}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteGift(gift.id)}
                    disabled={deletingId === gift.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {gift.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{gift.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                {gift.estimated_cost && <span>💰 {gift.estimated_cost}</span>}
                {gift.where_to_buy && <span>🛒 {gift.where_to_buy}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GiftPlanner;
