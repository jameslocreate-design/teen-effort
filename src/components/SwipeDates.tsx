import { useState, useEffect, useCallback } from "react";
import { Heart, X, Loader2, Sparkles, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateDateIdeas, type DateIdea, type DateFilters } from "@/lib/date-planner";
import { toast } from "sonner";

const SwipeDates = () => {
  const { user } = useAuth();
  const [partnerLinkId, setPartnerLinkId] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<DateIdea[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<DateIdea[]>([]);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [showMatch, setShowMatch] = useState<DateIdea | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("partner_links").select("id").eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle()
      .then(({ data }) => { if (data) setPartnerLinkId(data.id); });
  }, [user]);

  // Check for matches after voting
  const checkForMatch = useCallback(async (ideaHash: string, idea: DateIdea) => {
    if (!partnerLinkId) return;
    const { data: votes } = await supabase
      .from("date_votes")
      .select("user_id, vote")
      .eq("partner_link_id", partnerLinkId)
      .eq("idea_hash", ideaHash);

    if (!votes || votes.length < 2) return;
    const allLiked = votes.every(v => v.vote === "like");
    if (allLiked) {
      setShowMatch(idea);
      setMatches(prev => [...prev, idea]);
    }
  }, [partnerLinkId]);

  const generateIdeas = async () => {
    setLoading(true);
    setCurrentIndex(0);
    setMatches([]);
    try {
      const filters: DateFilters = {
        cost: null, location: null, activity: null, distance: null,
        timeRange: null, cuisine: null, latitude: null, longitude: null,
        funActivity: null, mood: null,
      };
      // Try to get location
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          filters.latitude = pos.coords.latitude;
          filters.longitude = pos.coords.longitude;
        } catch {}
      }
      const newIdeas = await generateDateIdeas(filters);
      setIdeas(newIdeas);
    } catch (err) {
      toast.error("Failed to generate ideas");
    }
    setLoading(false);
  };

  const handleVote = async (vote: "like" | "dislike") => {
    if (!user || !partnerLinkId || currentIndex >= ideas.length) return;
    const idea = ideas[currentIndex];
    const ideaHash = btoa(idea.title).replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);

    setSwipeDirection(vote === "like" ? "right" : "left");
    setTimeout(() => setSwipeDirection(null), 300);

    const { error } = await supabase.from("date_votes").insert({
      partner_link_id: partnerLinkId,
      user_id: user.id,
      idea_hash: ideaHash,
      idea_data: idea as any,
      vote,
    });

    if (error && !error.message.includes("duplicate")) {
      toast.error("Failed to save vote");
    }

    if (vote === "like") {
      await checkForMatch(ideaHash, idea);
    }

    setCurrentIndex(prev => prev + 1);
  };

  const currentIdea = ideas[currentIndex];
  const allSwiped = ideas.length > 0 && currentIndex >= ideas.length;

  if (!partnerLinkId) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70 font-sans">Together</p>
          <h2 className="text-2xl font-display font-semibold text-foreground">This or That</h2>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-8 text-center">
          <p className="text-sm text-muted-foreground font-sans">Link with your partner to start swiping on date ideas together!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70 font-sans">Together</p>
        <h2 className="text-2xl font-display font-semibold text-foreground">This or That</h2>
        <p className="text-sm text-muted-foreground font-sans">Swipe on ideas — matches appear when you both like the same one!</p>
      </div>

      {/* Match celebration overlay */}
      {showMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
          onClick={() => setShowMatch(null)}>
          <div className="text-center space-y-4 animate-fade-in-up p-8">
            <div className="text-6xl">💕</div>
            <h3 className="text-2xl font-display font-bold text-primary">It's a Match!</h3>
            <p className="text-foreground font-sans font-medium">{showMatch.title}</p>
            <p className="text-sm text-muted-foreground font-sans max-w-sm">{showMatch.description}</p>
            <Button onClick={() => setShowMatch(null)} className="rounded-xl font-sans">Continue Swiping</Button>
          </div>
        </div>
      )}

      {ideas.length === 0 && !loading && (
        <div className="text-center py-8 space-y-4">
          <Sparkles className="h-12 w-12 text-primary/30 mx-auto" />
          <Button onClick={generateIdeas} className="rounded-xl font-sans">
            <Sparkles className="h-4 w-4 mr-2" /> Generate Date Ideas to Swipe
          </Button>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-2 font-sans">Generating ideas...</p>
        </div>
      )}

      {currentIdea && !loading && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground text-center font-sans">{currentIndex + 1} / {ideas.length}</p>

          <div className={`rounded-2xl border border-border bg-card p-6 space-y-4 transition-all duration-300 ${
            swipeDirection === "left" ? "-translate-x-full opacity-0 rotate-[-10deg]" :
            swipeDirection === "right" ? "translate-x-full opacity-0 rotate-[10deg]" : ""
          }`}>
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-display font-semibold text-foreground">{currentIdea.title}</h3>
              {currentIdea.vibe && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-sans">{currentIdea.vibe}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed font-sans">{currentIdea.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground font-sans">
              {currentIdea.estimated_cost && <span>💰 {currentIdea.estimated_cost}</span>}
              {currentIdea.duration && <span>⏱ {currentIdea.duration}</span>}
              {currentIdea.distance_miles && <span>📍 {currentIdea.distance_miles}</span>}
              {currentIdea.rating && <span>⭐ {currentIdea.rating}</span>}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6">
            <Button
              variant="outline"
              size="lg"
              className="h-16 w-16 rounded-full border-2 border-destructive/30 hover:bg-destructive/10 hover:border-destructive"
              onClick={() => handleVote("dislike")}
            >
              <X className="h-6 w-6 text-destructive" />
            </Button>
            <Button
              size="lg"
              className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90"
              onClick={() => handleVote("like")}
            >
              <Heart className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}

      {allSwiped && (
        <div className="text-center space-y-4 py-6">
          <Check className="h-10 w-10 text-primary mx-auto" />
          <p className="text-sm text-foreground font-sans font-medium">All swiped!</p>
          {matches.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-primary font-sans">{matches.length} match{matches.length > 1 ? "es" : ""}! 💕</p>
              {matches.map((m, i) => (
                <div key={i} className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <p className="text-sm font-medium text-foreground font-sans">{m.title}</p>
                </div>
              ))}
            </div>
          )}
          <Button onClick={generateIdeas} variant="outline" className="rounded-xl font-sans">
            <RefreshCw className="h-4 w-4 mr-2" /> Generate More
          </Button>
        </div>
      )}
    </div>
  );
};

export default SwipeDates;
