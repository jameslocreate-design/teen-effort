import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, Heart, Star, CalendarDays, TrendingUp, DollarSign } from "lucide-react";
import { format, parseISO, subMonths, isAfter } from "date-fns";

interface StatsEntry {
  id: string;
  date: string;
  title: string;
  estimated_cost: string | null;
  user_rating: number | null;
  is_favorite: boolean;
  vibe: string | null;
}

const costToNumber = (cost: string | null): number => {
  if (!cost) return 0;
  const match = cost.match(/\d+/);
  return match ? parseInt(match[0]) : 0;
};

const DateStats = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<StatsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const { data: link } = await supabase
      .from("partner_links").select("id").eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
    if (!link) { setLoading(false); return; }

    const { data } = await supabase
      .from("calendar_entries")
      .select("id, date, title, estimated_cost, user_rating, is_favorite, vibe")
      .eq("partner_link_id", link.id)
      .order("date", { ascending: false });

    if (data) setEntries(data as StatsEntry[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalDates = entries.length;
  const ratedDates = entries.filter(e => e.user_rating);
  const avgRating = ratedDates.length > 0
    ? (ratedDates.reduce((s, e) => s + (e.user_rating || 0), 0) / ratedDates.length).toFixed(1)
    : "—";
  const favorites = entries.filter(e => e.is_favorite).length;
  const totalSpent = entries.reduce((s, e) => s + costToNumber(e.estimated_cost), 0);

  const threeMonthsAgo = subMonths(new Date(), 3);
  const recentDates = entries.filter(e => isAfter(parseISO(e.date), threeMonthsAgo));

  // Vibe breakdown
  const vibeMap: Record<string, number> = {};
  entries.forEach(e => { if (e.vibe) vibeMap[e.vibe] = (vibeMap[e.vibe] || 0) + 1; });
  const topVibes = Object.entries(vibeMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Monthly breakdown (last 6 months)
  const monthlyMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(new Date(), i);
    const key = format(m, "MMM");
    monthlyMap[key] = 0;
  }
  entries.forEach(e => {
    const key = format(parseISO(e.date), "MMM");
    if (key in monthlyMap) monthlyMap[key]++;
  });
  const maxMonthly = Math.max(...Object.values(monthlyMap), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center animate-pulse">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Date Stats</h2>
        <p className="text-sm text-muted-foreground">Your relationship by the numbers</p>
      </div>

      {totalDates === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No dates yet! Plan some dates to see your stats here.
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span className="text-xs font-medium">Total Dates</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalDates}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Star className="h-4 w-4" />
                <span className="text-xs font-medium">Avg Rating</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{avgRating}<span className="text-sm text-muted-foreground">/5</span></p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Heart className="h-4 w-4" />
                <span className="text-xs font-medium">Favorites</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{favorites}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium">Est. Spent</span>
              </div>
              <p className="text-2xl font-bold text-foreground">${totalSpent}</p>
            </div>
          </div>

          {/* Monthly bar chart */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Dates Per Month</h3>
            </div>
            <div className="flex items-end gap-2 h-28">
              {Object.entries(monthlyMap).map(([month, count]) => (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground font-medium">{count}</span>
                  <div
                    className="w-full rounded-t-md bg-primary/80 transition-all"
                    style={{ height: `${(count / maxMonthly) * 80}%`, minHeight: count > 0 ? "8px" : "2px" }}
                  />
                  <span className="text-[10px] text-muted-foreground">{month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top vibes */}
          {topVibes.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Top Vibes</h3>
              <div className="space-y-2">
                {topVibes.map(([vibe, count]) => (
                  <div key={vibe} className="flex items-center gap-3">
                    <span className="text-sm text-foreground flex-1">✨ {vibe}</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(count / topVibes[0][1]) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent timeline */}
          {recentDates.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Recent Timeline</h3>
              <div className="space-y-3">
                {recentDates.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{entry.title}</p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(entry.date), "MMM d, yyyy")}</p>
                    </div>
                    {entry.user_rating && (
                      <div className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        <span className="text-xs text-muted-foreground">{entry.user_rating}</span>
                      </div>
                    )}
                    {entry.is_favorite && <Heart className="h-3 w-3 fill-red-400 text-red-400" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DateStats;
