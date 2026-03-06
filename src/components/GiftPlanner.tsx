import { useState } from "react";
import { Loader2, Sparkles, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FilterGroup from "@/components/FilterGroup";
import GiftIdeaCard from "@/components/GiftIdeaCard";
import { generateGiftIdeas, type GiftFilters, type GiftIdea } from "@/lib/gift-planner";
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
  { value: "Prom / Homecoming", label: "Prom", icon: "👗" },
];

const GiftPlanner = () => {
  const [filters, setFilters] = useState<GiftFilters>({
    cost: null,
    personalization: null,
    event: null,
  });

  const [ideas, setIdeas] = useState<GiftIdea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

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
            <GiftIdeaCard key={i} idea={idea} index={i} />
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
    </div>
  );
};

export default GiftPlanner;
