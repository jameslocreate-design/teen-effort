import { useState } from "react";
import { Heart, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import FilterGroup from "@/components/FilterGroup";
import DateIdeaCard from "@/components/DateIdeaCard";
import { generateDateIdeas, type DateFilters, type DateIdea } from "@/lib/date-planner";
import { toast } from "sonner";

const costOptions = [
  { value: "Free", label: "Free", icon: "🆓" },
  { value: "Budget ($1-25)", label: "Budget", icon: "💵" },
  { value: "Moderate ($25-75)", label: "Moderate", icon: "💰" },
  { value: "Splurge ($75+)", label: "Splurge", icon: "💎" },
];

const locationOptions = [
  { value: "Indoor", label: "Indoor", icon: "🏠" },
  { value: "Outdoor", label: "Outdoor", icon: "🌳" },
  { value: "Both indoor and outdoor", label: "Mix", icon: "🌆" },
];

const activityOptions = [
  { value: "Adventurous & thrilling", label: "Adventure", icon: "🧗" },
  { value: "Romantic & intimate", label: "Romantic", icon: "💕" },
  { value: "Relaxed & laid-back", label: "Relaxed", icon: "☕" },
  { value: "Creative & artistic", label: "Creative", icon: "🎨" },
  { value: "Food & drink focused", label: "Foodie", icon: "🍷" },
];

const distanceOptions = [
  { value: "Walking distance", label: "Walking", icon: "🚶" },
  { value: "Short drive (under 30 min)", label: "Short Drive", icon: "🚗" },
  { value: "Day trip (30-60 min drive)", label: "Day Trip", icon: "🗺️" },
  { value: "Road trip (1+ hours)", label: "Road Trip", icon: "🛣️" },
];

const DatePlanner = () => {
  const [filters, setFilters] = useState<DateFilters>({
    cost: null,
    location: null,
    activity: null,
    distance: null,
  });
  const [ideas, setIdeas] = useState<DateIdea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const updateFilter = (key: keyof DateFilters) => (value: string | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const hasAnyFilter = Object.values(filters).some(Boolean);

  const handleGenerate = async () => {
    setIsLoading(true);
    setHasGenerated(true);
    try {
      const result = await generateDateIdeas(filters);
      setIdeas(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate ideas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center glow-sm">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Date Planner</h1>
              <p className="text-xs text-muted-foreground">Plan the perfect date in seconds</p>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        <div className="space-y-6">
          <FilterGroup label="Budget" options={costOptions} selected={filters.cost} onSelect={updateFilter("cost")} />
          <FilterGroup label="Setting" options={locationOptions} selected={filters.location} onSelect={updateFilter("location")} />
          <FilterGroup label="Vibe" options={activityOptions} selected={filters.activity} onSelect={updateFilter("activity")} />
          <FilterGroup label="Distance" options={distanceOptions} selected={filters.distance} onSelect={updateFilter("distance")} />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isLoading}
          size="lg"
          className="w-full rounded-xl text-base font-semibold h-12"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating ideas...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {hasAnyFilter ? "Generate Date Ideas" : "Surprise Me"}
            </>
          )}
        </Button>

        {/* Results */}
        {hasGenerated && !isLoading && ideas.length > 0 && (
          <div className="space-y-4 pb-12">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Your Date Ideas
            </h2>
            {ideas.map((idea, i) => (
              <DateIdeaCard key={i} idea={idea} index={i} />
            ))}
            <Button
              variant="outline"
              onClick={handleGenerate}
              className="w-full rounded-xl"
            >
              <Sparkles className="h-4 w-4" />
              Generate More
            </Button>
          </div>
        )}

        {hasGenerated && !isLoading && ideas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No ideas generated. Try adjusting your filters.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default DatePlanner;
