import { useState, useEffect } from "react";
import { Brain, Sparkles, Loader2, TrendingUp, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateDateIdeas, type DateIdea, type DateFilters } from "@/lib/date-planner";
import DateIdeaCard from "@/components/DateIdeaCard";
import { toast } from "sonner";

interface UserPreferences {
  topVibes: string[];
  topCuisines: string[];
  avgRating: number;
  preferredCost: string;
  totalDates: number;
}

const SmartRecommendations = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [ideas, setIdeas] = useState<DateIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(true);

  useEffect(() => {
    if (!user) return;
    const analyze = async () => {
      const { data: link } = await supabase
        .from("partner_links").select("id").eq("status", "accepted")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();

      // Get calendar entries + reviews
      const [calRes, reviewRes] = await Promise.all([
        link ? supabase.from("calendar_entries")
          .select("vibe, user_rating, estimated_cost")
          .eq("partner_link_id", link.id) : { data: [] },
        supabase.from("date_reviews")
          .select("venue_type, rating, cost_range, date_type")
          .eq("user_id", user.id),
      ]);

      const entries = calRes.data || [];
      const reviews = reviewRes.data || [];

      // Analyze vibes
      const vibeCounts: Record<string, number> = {};
      entries.forEach(e => { if (e.vibe) vibeCounts[e.vibe] = (vibeCounts[e.vibe] || 0) + 1; });
      reviews.forEach(r => { if (r.date_type) vibeCounts[r.date_type] = (vibeCounts[r.date_type] || 0) + 1; });
      const topVibes = Object.entries(vibeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([v]) => v);

      // Analyze cuisines from reviews
      const cuisineCounts: Record<string, number> = {};
      reviews.forEach(r => { if (r.venue_type) cuisineCounts[r.venue_type] = (cuisineCounts[r.venue_type] || 0) + 1; });
      const topCuisines = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);

      // Average rating
      const ratings = [...entries.filter(e => e.user_rating).map(e => e.user_rating!), ...reviews.map(r => r.rating)];
      const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      // Cost preference
      const costs: Record<string, number> = {};
      entries.forEach(e => { if (e.estimated_cost) costs[e.estimated_cost] = (costs[e.estimated_cost] || 0) + 1; });
      reviews.forEach(r => { if (r.cost_range) costs[r.cost_range] = (costs[r.cost_range] || 0) + 1; });
      const preferredCost = Object.entries(costs).sort((a, b) => b[1] - a[1])[0]?.[0] || "any";

      setPreferences({
        topVibes,
        topCuisines,
        avgRating: Math.round(avgRating * 10) / 10,
        preferredCost,
        totalDates: entries.length + reviews.length,
      });
      setAnalyzing(false);
    };
    analyze();
  }, [user]);

  const generateSmart = async () => {
    if (!preferences) return;
    setLoading(true);
    try {
      const filters: DateFilters = {
        cost: preferences.preferredCost !== "any" ? [preferences.preferredCost] : null,
        location: null,
        activity: preferences.topVibes.length ? preferences.topVibes : null,
        distance: null,
        timeRange: null,
        cuisine: preferences.topCuisines.length ? preferences.topCuisines : null,
        latitude: null,
        longitude: null,
        funActivity: null,
        mood: preferences.topVibes.length ? preferences.topVibes : null,
      };

      // Try location
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          filters.latitude = pos.coords.latitude;
          filters.longitude = pos.coords.longitude;
        } catch {}
      }

      setIdeas(await generateDateIdeas(filters));
    } catch (err) {
      toast.error("Failed to generate recommendations");
    }
    setLoading(false);
  };

  if (analyzing) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70 font-sans">AI Powered</p>
          <h2 className="text-2xl font-display font-semibold text-foreground">Smart Recommendations</h2>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-8 text-center">
          <Brain className="h-8 w-8 text-primary mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground font-sans">Analyzing your date history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70 font-sans">AI Powered</p>
        <h2 className="text-2xl font-display font-semibold text-foreground">Smart Recommendations</h2>
        <p className="text-sm text-muted-foreground font-sans">Personalized based on your date history & reviews.</p>
      </div>

      {/* Insights */}
      {preferences && preferences.totalDates > 0 && (
        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground font-sans">Your Date Profile</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground font-sans">Favorite vibes</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {preferences.topVibes.length ? preferences.topVibes.map(v => (
                  <span key={v} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-sans">{v}</span>
                )) : <span className="text-xs text-muted-foreground font-sans">Not enough data</span>}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Avg rating</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-medium text-foreground font-sans">{preferences.avgRating || "N/A"}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Budget preference</p>
              <p className="text-sm font-medium text-foreground font-sans mt-1">{preferences.preferredCost}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Dates analyzed</p>
              <p className="text-sm font-medium text-foreground font-sans mt-1">{preferences.totalDates}</p>
            </div>
          </div>
        </div>
      )}

      {preferences && preferences.totalDates === 0 && (
        <div className="rounded-2xl border border-border bg-card/60 p-6 text-center">
          <p className="text-sm text-muted-foreground font-sans">
            Go on some dates and leave reviews to unlock personalized recommendations!
          </p>
        </div>
      )}

      <Button
        onClick={generateSmart}
        disabled={loading}
        className="w-full rounded-2xl h-12 text-sm font-semibold font-sans"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating personalized ideas...</>
        ) : (
          <><Brain className="h-4 w-4 mr-2" /> Get Smart Recommendations</>
        )}
      </Button>

      {ideas.length > 0 && (
        <div className="space-y-3">
          {ideas.map((idea, i) => (
            <DateIdeaCard key={i} idea={idea} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartRecommendations;
