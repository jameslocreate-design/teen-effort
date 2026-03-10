import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Lock } from "lucide-react";

interface BadgeDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  check: (stats: Stats) => boolean;
}

interface Stats {
  totalDates: number;
  totalFavorites: number;
  totalRated: number;
  totalPhotos: number;
  totalBucketCompleted: number;
  totalBucketItems: number;
  totalGiftsSaved: number;
  hasPartner: boolean;
}

const BADGES: BadgeDef[] = [
  { id: "first-date", emoji: "🌟", title: "First Date", description: "Plan your first date", check: (s) => s.totalDates >= 1 },
  { id: "five-dates", emoji: "🔥", title: "On a Roll", description: "Complete 5 dates", check: (s) => s.totalDates >= 5 },
  { id: "ten-dates", emoji: "💎", title: "Date Pro", description: "Complete 10 dates", check: (s) => s.totalDates >= 10 },
  { id: "twenty-five", emoji: "👑", title: "Date Royalty", description: "Complete 25 dates", check: (s) => s.totalDates >= 25 },
  { id: "first-fav", emoji: "❤️", title: "Heart Eyes", description: "Favorite your first date", check: (s) => s.totalFavorites >= 1 },
  { id: "five-favs", emoji: "💕", title: "Hopeless Romantic", description: "Favorite 5 dates", check: (s) => s.totalFavorites >= 5 },
  { id: "critic", emoji: "⭐", title: "Date Critic", description: "Rate 3 dates", check: (s) => s.totalRated >= 3 },
  { id: "photographer", emoji: "📸", title: "Photographer", description: "Upload your first photo", check: (s) => s.totalPhotos >= 1 },
  { id: "scrapbook", emoji: "🖼️", title: "Scrapbook Master", description: "Upload 10 photos", check: (s) => s.totalPhotos >= 10 },
  { id: "bucket-starter", emoji: "✅", title: "Bucket Starter", description: "Complete a bucket list item", check: (s) => s.totalBucketCompleted >= 1 },
  { id: "bucket-champ", emoji: "🏆", title: "Bucket Champion", description: "Complete 5 bucket list items", check: (s) => s.totalBucketCompleted >= 5 },
  { id: "gift-guru", emoji: "🎁", title: "Gift Guru", description: "Save 3 gift ideas", check: (s) => s.totalGiftsSaved >= 3 },
  { id: "linked-up", emoji: "🔗", title: "Linked Up", description: "Link with your partner", check: (s) => s.hasPartner },
  { id: "dreamer", emoji: "💭", title: "Dreamer", description: "Add 5 bucket list items", check: (s) => s.totalBucketItems >= 5 },
];

const Achievements = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    const { data: link } = await supabase
      .from("partner_links").select("id").eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();

    const hasPartner = !!link;
    let totalDates = 0, totalFavorites = 0, totalRated = 0, totalPhotos = 0;
    let totalBucketCompleted = 0, totalBucketItems = 0;

    if (link) {
      const { data: calData } = await supabase
        .from("calendar_entries")
        .select("is_favorite, user_rating, photo_urls")
        .eq("partner_link_id", link.id);

      if (calData) {
        totalDates = calData.length;
        totalFavorites = calData.filter((e: any) => e.is_favorite).length;
        totalRated = calData.filter((e: any) => e.user_rating).length;
        totalPhotos = calData.reduce((s: number, e: any) => s + (e.photo_urls?.length || 0), 0);
      }

      const { data: bucketData } = await supabase
        .from("bucket_list")
        .select("completed")
        .eq("partner_link_id", link.id);

      if (bucketData) {
        totalBucketItems = bucketData.length;
        totalBucketCompleted = bucketData.filter((b: any) => b.completed).length;
      }
    }

    const { count: giftCount } = await supabase
      .from("saved_gifts").select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    setStats({
      totalDates, totalFavorites, totalRated, totalPhotos,
      totalBucketCompleted, totalBucketItems,
      totalGiftsSaved: giftCount || 0, hasPartner,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center animate-pulse">
          <Trophy className="h-5 w-5 text-primary" />
        </div>
      </div>
    );
  }

  const earned = BADGES.filter(b => b.check(stats));
  const locked = BADGES.filter(b => !b.check(stats));

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
          <Trophy className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Achievements</h2>
        <p className="text-sm text-muted-foreground">
          {earned.length} of {BADGES.length} badges earned
        </p>
        {/* Progress bar */}
        <div className="w-48 h-2 rounded-full bg-secondary mx-auto overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(earned.length / BADGES.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Earned */}
      {earned.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Earned</h3>
          <div className="grid grid-cols-2 gap-3">
            {earned.map(badge => (
              <div
                key={badge.id}
                className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-1 animate-fade-in"
              >
                <span className="text-2xl">{badge.emoji}</span>
                <h4 className="font-semibold text-foreground text-sm">{badge.title}</h4>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Locked</h3>
          <div className="grid grid-cols-2 gap-3">
            {locked.map(badge => (
              <div
                key={badge.id}
                className="rounded-xl border border-border bg-card p-4 space-y-1 opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl grayscale">{badge.emoji}</span>
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-foreground text-sm">{badge.title}</h4>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Achievements;
