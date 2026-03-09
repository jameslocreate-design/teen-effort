import { useState, useEffect, useCallback } from "react";
import { Loader2, Sparkles, CalendarPlus, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import FilterGroup from "@/components/FilterGroup";
import DateIdeaCard from "@/components/DateIdeaCard";
import { generateDateIdeas, type DateFilters, type DateIdea } from "@/lib/date-planner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

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
  { value: "Fun activity", label: "Fun Activity", icon: "🎳" },
];

const funActivityOptions = [
  { value: "Mini Golf", label: "Mini Golf", icon: "⛳" },
  { value: "Bowling", label: "Bowling", icon: "🎳" },
  { value: "Karaoke", label: "Karaoke", icon: "🎤" },
  { value: "Arcade", label: "Arcade", icon: "🕹️" },
  { value: "Go-Karts", label: "Go-Karts", icon: "🏎️" },
  { value: "Escape Room", label: "Escape Room", icon: "🔐" },
  { value: "Laser Tag", label: "Laser Tag", icon: "🔫" },
  { value: "Ice Skating", label: "Ice Skating", icon: "⛸️" },
];

const cuisineOptions = [
  { value: "Italian", label: "Italian", icon: "🍝" },
  { value: "American", label: "American", icon: "🍔" },
  { value: "Chinese", label: "Chinese", icon: "🥡" },
  { value: "Japanese", label: "Japanese", icon: "🍣" },
  { value: "Mexican", label: "Mexican", icon: "🌮" },
  { value: "Thai", label: "Thai", icon: "🍜" },
  { value: "French", label: "French", icon: "🥐" },
  { value: "Indian", label: "Indian", icon: "🍛" },
];

const distanceOptions = [
  { value: "Walking distance", label: "Walking", icon: "🚶" },
  { value: "Short drive (under 30 min)", label: "Short Drive", icon: "🚗" },
  { value: "Day trip (30-60 min drive)", label: "Day Trip", icon: "🗺️" },
  { value: "Road trip (1+ hours)", label: "Road Trip", icon: "🛣️" },
];

const timePresets = [
  { value: "1 hour", label: "1 hr", icon: "⚡" },
  { value: "2-3 hours", label: "2-3 hrs", icon: "🕐" },
  { value: "Half day (4-6 hours)", label: "Half Day", icon: "🌤️" },
  { value: "Full day", label: "Full Day", icon: "☀️" },
];

const DatePlanner = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<DateFilters>({
    cost: null,
    location: null,
    activity: null,
    distance: null,
    timeRange: null,
    cuisine: null,
    latitude: null,
    longitude: null,
    funActivity: null,
  });

  const [ideas, setIdeas] = useState<DateIdea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [partnerLinkId, setPartnerLinkId] = useState<string | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<DateIdea | null>(null);
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState<number | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");

  const fetchPartnerLink = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("partner_links")
      .select("id")
      .eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .maybeSingle();
    if (data) setPartnerLinkId(data.id);
  }, [user]);

  useEffect(() => { fetchPartnerLink(); }, [fetchPartnerLink]);

  // Auto-request geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFilters(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        setLocationStatus("granted");
      },
      () => {
        setLocationStatus("denied");
      },
      { timeout: 10000 }
    );
  }, []);

  const updateFilter = (key: keyof DateFilters) => (value: string | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const hasAnyFilter = filters.cost || filters.location || filters.activity || filters.distance || filters.timeRange || filters.cuisine;

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

  const handleOpenDatePicker = (idea: DateIdea, index: number) => {
    if (!user || !partnerLinkId) {
      toast.error("Link with a partner first to save dates!");
      return;
    }
    setSelectedIdea(idea);
    setSelectedIdeaIndex(index);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedCalendarDate(tomorrow);
    setDatePickerOpen(true);
  };

  const handleConfirmDate = async () => {
    if (!selectedCalendarDate || !selectedIdea || selectedIdeaIndex === null || !user || !partnerLinkId) return;

    setSavingIndex(selectedIdeaIndex);
    setDatePickerOpen(false);

    // Format date in local timezone to avoid off-by-one errors
    const localDateStr = format(selectedCalendarDate, "yyyy-MM-dd");

    const { error } = await supabase.from("calendar_entries").insert({
      partner_link_id: partnerLinkId,
      added_by: user.id,
      date: localDateStr,
      event_time: selectedTime || null,
      title: selectedIdea.title,
      description: selectedIdea.description,
      estimated_cost: selectedIdea.estimated_cost,
      duration: selectedIdea.duration,
      vibe: selectedIdea.vibe,
    });

    if (error) {
      toast.error("Failed to save to calendar");
    } else {
      toast.success(`"${selectedIdea.title}" added to calendar!`);
    }
    setSavingIndex(null);
    setSelectedIdea(null);
    setSelectedIdeaIndex(null);
    setSelectedCalendarDate(undefined);
  };

  return (
    <div className="space-y-8">
      {/* Location status indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        {locationStatus === "loading" && "Detecting location..."}
        {locationStatus === "granted" && (
          <span className="text-primary">Location detected — dates will be nearby</span>
        )}
        {locationStatus === "denied" && (
          <span>Location unavailable — enable location for local suggestions</span>
        )}
        {locationStatus === "idle" && "Waiting for location..."}
      </div>

      <div className="space-y-6">
        <FilterGroup label="Budget" options={costOptions} selected={filters.cost} onSelect={updateFilter("cost")} />
        <FilterGroup label="Setting" options={locationOptions} selected={filters.location} onSelect={updateFilter("location")} />
        <FilterGroup label="Vibe" options={activityOptions} selected={filters.activity} onSelect={updateFilter("activity")} />
        {filters.activity === "Fun activity" && (
          <FilterGroup label="Specific Activity" options={funActivityOptions} selected={filters.funActivity} onSelect={updateFilter("funActivity")} />
        )}
        <FilterGroup label="Cuisine" options={cuisineOptions} selected={filters.cuisine} onSelect={updateFilter("cuisine")} />
        <FilterGroup label="Distance" options={distanceOptions} selected={filters.distance} onSelect={updateFilter("distance")} />
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Time Available</h3>
          <div className="flex flex-wrap gap-2">
            {timePresets.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateFilter("timeRange")(filters.timeRange === opt.value ? null : opt.value)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  filters.timeRange === opt.value
                    ? "border-primary/50 bg-primary/15 text-primary glow-sm"
                    : "border-border bg-secondary/40 text-secondary-foreground hover:border-primary/30 hover:bg-secondary/70"
                )}
              >
                <span className="text-base">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
          <Input
            placeholder="Or type custom time, e.g. '6pm - 9pm' or '3 hours'"
            value={filters.timeRange && !timePresets.some(p => p.value === filters.timeRange) ? filters.timeRange : ""}
            onChange={(e) => updateFilter("timeRange")(e.target.value || null)}
            className="rounded-xl border-border bg-secondary/40 text-sm"
          />
        </div>
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
                  onClick={() => handleOpenDatePicker(idea, i)}
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

      {/* Date Picker Dialog */}
      <Dialog open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Choose a Date</DialogTitle>
            <DialogDescription>
              Select when you'd like to schedule "{selectedIdea?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Calendar
              mode="single"
              selected={selectedCalendarDate}
              onSelect={setSelectedCalendarDate}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
              className="rounded-xl border border-border"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDatePickerOpen(false);
                setSelectedIdea(null);
                setSelectedIdeaIndex(null);
                setSelectedCalendarDate(undefined);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDate}
              disabled={!selectedCalendarDate}
              className="gap-2"
            >
              <CalendarPlus className="h-4 w-4" />
              Add to Calendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatePlanner;
