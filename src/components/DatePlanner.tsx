import { useState, useEffect, useCallback } from "react";
import { Loader2, Sparkles, MapPin } from "lucide-react";
import WeatherWidget from "@/components/WeatherWidget";
import { Button } from "@/components/ui/button";
import DateFilters from "@/components/date-planner/DateFilters";
import DateResults from "@/components/date-planner/DateResults";
import DatePickerDialog from "@/components/date-planner/DatePickerDialog";
import MoodSelector from "@/components/MoodSelector";
import DateCountdown from "@/components/DateCountdown";
import SavedDateIdeas from "@/components/SavedDateIdeas";
import { generateDateIdeas, type DateFilters as DateFiltersType, type DateIdea } from "@/lib/date-planner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

const DatePlanner = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<DateFiltersType>({
    cost: null, location: null, activity: null, distance: null,
    timeRange: null, cuisine: null, latitude: null, longitude: null, funActivity: null, mood: null,
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
  const [savingForLaterIndex, setSavingForLaterIndex] = useState<number | null>(null);
  const [savedRefreshKey, setSavedRefreshKey] = useState(0);

  const fetchPartnerLink = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("partner_links").select("id").eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
    if (data) setPartnerLinkId(data.id);
  }, [user]);

  useEffect(() => { fetchPartnerLink(); }, [fetchPartnerLink]);

  useEffect(() => {
    if (!navigator.geolocation) { setLocationStatus("denied"); return; }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFilters(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied"),
      { timeout: 10000 }
    );
  }, []);

  const updateFilter = (key: keyof DateFiltersType) => (value: string | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const hasAnyFilter = filters.cost || filters.location || filters.activity || filters.distance || filters.timeRange || filters.cuisine;

  const handleGenerate = async () => {
    setIsLoading(true);
    setHasGenerated(true);
    try {
      setIdeas(await generateDateIdeas(filters));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate ideas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDatePicker = (idea: DateIdea, index: number) => {
    if (!user || !partnerLinkId) { toast.error("Link with a partner first to save dates!"); return; }
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
    const { error } = await supabase.from("calendar_entries").insert({
      partner_link_id: partnerLinkId, added_by: user.id,
      date: format(selectedCalendarDate, "yyyy-MM-dd"),
      event_time: selectedTime || null, title: selectedIdea.title,
      description: selectedIdea.description, estimated_cost: selectedIdea.estimated_cost,
      duration: selectedIdea.duration, vibe: selectedIdea.vibe,
      yelp_url: selectedIdea.url || null, yelp_rating: selectedIdea.rating || null,
      yelp_review_count: selectedIdea.review_count || null,
    });
    if (error) toast.error("Failed to save to calendar");
    else toast.success(`"${selectedIdea.title}" added to calendar!`);
    setSavingIndex(null); setSelectedIdea(null); setSelectedIdeaIndex(null);
    setSelectedCalendarDate(undefined); setSelectedTime("");
  };

  const handleCancelDatePicker = () => {
    setDatePickerOpen(false); setSelectedIdea(null); setSelectedIdeaIndex(null);
    setSelectedCalendarDate(undefined); setSelectedTime("");
  };

  const handleSaveForLater = async (idea: DateIdea, index: number) => {
    if (!user) { toast.error("You must be logged in"); return; }
    setSavingForLaterIndex(index);
    const { error } = await supabase.from("saved_date_ideas").insert({
      user_id: user.id,
      title: idea.title,
      description: idea.description,
      estimated_cost: idea.estimated_cost,
      duration: idea.duration,
      vibe: idea.vibe,
      distance_miles: idea.distance_miles,
      yelp_rating: idea.rating || null,
      yelp_review_count: idea.review_count || null,
      yelp_url: idea.url || null,
    });
    if (error) toast.error("Failed to save idea");
    else {
      toast.success(`"${idea.title}" saved for later!`);
      setSavedRefreshKey(k => k + 1);
    }
    setSavingForLaterIndex(null);
  };

  return (
    <div className="space-y-10">
      {/* Hero section */}
      <div className="space-y-3 animate-fade-in-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70 font-sans">Curated Planning</p>
        <h1 className="text-4xl sm:text-5xl font-display font-semibold text-foreground leading-[1.1]">
          The Perfect Date
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md font-sans">
          Refine the atmosphere of your evening to let us uncover the ideal destination.
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
        <MapPin className="h-3.5 w-3.5" />
        {locationStatus === "loading" && "Detecting location..."}
        {locationStatus === "granted" && <span className="text-primary">Location detected — dates will be nearby</span>}
        {locationStatus === "denied" && <span>Location unavailable — enable location for local suggestions</span>}
        {locationStatus === "idle" && "Waiting for location..."}
      </div>

      <WeatherWidget />

      <DateCountdown />

      <MoodSelector selected={filters.mood} onSelect={(mood) => setFilters(prev => ({ ...prev, mood }))} />

      <DateFilters filters={filters} onFilterChange={updateFilter} />

      <Button
        onClick={handleGenerate}
        disabled={isLoading}
        size="lg"
        className="w-full rounded-2xl text-base font-semibold h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-sans transition-all duration-200 active:scale-[0.98]"
      >
        {isLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Curating your evening...</>
        ) : (
          <><Sparkles className="h-4 w-4" />{hasAnyFilter ? "Discover Dates" : "Surprise Me"}</>
        )}
      </Button>

      {hasGenerated && !isLoading && (
        <DateResults
          ideas={ideas} partnerLinkId={partnerLinkId} savingIndex={savingIndex} savingForLaterIndex={savingForLaterIndex}
          onAddToCalendar={handleOpenDatePicker} onSaveForLater={handleSaveForLater} onGenerateMore={handleGenerate}
        />
      )}

      <SavedDateIdeas
        onAddToCalendar={handleOpenDatePicker}
        refreshKey={savedRefreshKey}
      />

      <DatePickerDialog
        open={datePickerOpen} onOpenChange={setDatePickerOpen}
        selectedIdea={selectedIdea} selectedDate={selectedCalendarDate}
        onDateSelect={setSelectedCalendarDate} selectedTime={selectedTime}
        onTimeChange={setSelectedTime} onConfirm={handleConfirmDate}
        onCancel={handleCancelDatePicker}
      />
    </div>
  );
};

export default DatePlanner;
