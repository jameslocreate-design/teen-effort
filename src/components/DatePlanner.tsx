import { useState, useEffect, useCallback } from "react";
import { Heart, Loader2, Sparkles, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import FilterGroup from "@/components/FilterGroup";
import DateIdeaCard from "@/components/DateIdeaCard";
import { generateDateIdeas, type DateFilters, type DateIdea } from "@/lib/date-planner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
  const [filters, setFilters] = useState<DateFilters>({
    cost: null,
    location: null,
    activity: null,
    distance: null,
    zipcode: null,
  });

  const [ideas, setIdeas] = useState<DateIdea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [partnerLinkId, setPartnerLinkId] = useState<string | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const fetchPartnerLinkAndZipcode = useCallback(async () => {
    if (!user) return;
    const [{ data: linkData }, { data: profileData }] = await Promise.all([
      supabase
        .from("partner_links")
        .select("id")
        .eq("status", "accepted")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("zipcode")
        .eq("user_id", user.id)
        .single(),
    ]);
    if (linkData) setPartnerLinkId(linkData.id);
    if (profileData?.zipcode) {
      setFilters(prev => ({ ...prev, zipcode: profileData.zipcode }));
    }
  }, [user]);

  useEffect(() => { fetchPartnerLink(); }, [fetchPartnerLink]);

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

  const handleSaveToCalendar = async (idea: DateIdea, index: number) => {
    if (!user || !partnerLinkId) {
      toast.error("Link with a partner first to save dates!");
      return;
    }

    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = prompt("Enter date (YYYY-MM-DD):", tomorrow.toISOString().split("T")[0]);
    if (!dateStr) return;

    setSavingIndex(index);
    const { error } = await supabase.from("calendar_entries").insert({
      partner_link_id: partnerLinkId,
      added_by: user.id,
      date: dateStr,
      title: idea.title,
      description: idea.description,
      estimated_cost: idea.estimated_cost,
      duration: idea.duration,
      vibe: idea.vibe,
    });

    if (error) {
      toast.error("Failed to save to calendar");
    } else {
      toast.success(`"${idea.title}" added to calendar!`);
    }
    setSavingIndex(null);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <FilterGroup label="Budget" options={costOptions} selected={filters.cost} onSelect={updateFilter("cost")} />
        <FilterGroup label="Setting" options={locationOptions} selected={filters.location} onSelect={updateFilter("location")} />
        <FilterGroup label="Vibe" options={activityOptions} selected={filters.activity} onSelect={updateFilter("activity")} />
        <FilterGroup label="Distance" options={distanceOptions} selected={filters.distance} onSelect={updateFilter("distance")} />
      </div>

      <Button onClick={handleGenerate} disabled={isLoading} size="lg" className="w-full rounded-xl text-base font-semibold h-12">
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

      {hasGenerated && !isLoading && ideas.length > 0 && (
        <div className="space-y-4 pb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Your Date Ideas
          </h2>
          {ideas.map((idea, i) => (
            <div key={i} className="relative">
              <DateIdeaCard idea={idea} index={i} />
              {partnerLinkId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveToCalendar(idea, i)}
                  disabled={savingIndex === i}
                  className="absolute top-3 right-3 rounded-lg text-xs"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  {savingIndex === i ? "Saving..." : "Add to Calendar"}
                </Button>
              )}
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
    </div>
  );
};

export default DatePlanner;
