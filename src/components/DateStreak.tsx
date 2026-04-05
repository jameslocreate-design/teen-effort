import { useState, useEffect } from "react";
import { Flame, Trophy, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, subWeeks, isWithinInterval, endOfWeek, parseISO } from "date-fns";

const milestones = [
  { weeks: 4, label: "1 Month Streak!", emoji: "🔥" },
  { weeks: 8, label: "2 Month Streak!", emoji: "💪" },
  { weeks: 12, label: "3 Month Streak!", emoji: "⭐" },
  { weeks: 26, label: "6 Month Streak!", emoji: "🏆" },
  { weeks: 52, label: "1 Year Streak!", emoji: "👑" },
];

const DateStreak = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchStreak = async () => {
      const { data: link } = await supabase
        .from("partner_links").select("id").eq("status", "accepted")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
      if (!link) { setLoading(false); return; }

      const { data: entries } = await supabase
        .from("calendar_entries").select("date")
        .eq("partner_link_id", link.id)
        .order("date", { ascending: false });

      if (!entries?.length) { setLoading(false); return; }

      const now = new Date();
      let currentStreak = 0;

      // Check each week going backwards
      for (let i = 0; i < 104; i++) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const hasDate = entries.some(e =>
          isWithinInterval(parseISO(e.date), { start: weekStart, end: weekEnd })
        );
        if (hasDate) currentStreak++;
        else if (i > 0) break; // Allow current week to be empty
        else if (i === 0 && !hasDate) {
          // Check if current week just started, allow grace
          continue;
        }
      }
      setStreak(currentStreak);
      setLoading(false);
    };
    fetchStreak();
  }, [user]);

  if (loading || streak === 0) return null;

  const currentMilestone = milestones.filter(m => streak >= m.weeks).pop();
  const nextMilestone = milestones.find(m => streak < m.weeks);

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <h3 className="text-sm font-semibold text-foreground font-sans">Date Night Streak</h3>
        </div>
        {currentMilestone && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-sans">
            {currentMilestone.emoji} {currentMilestone.label}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className={`text-4xl font-display font-bold ${streak >= 4 ? "text-orange-500" : "text-foreground"}`}>
          {streak}
        </div>
        <div>
          <p className="text-sm text-foreground font-sans">consecutive weeks</p>
          <p className="text-xs text-muted-foreground font-sans">with a date night</p>
        </div>
      </div>

      {/* Streak visualization - last 12 weeks */}
      <div className="flex gap-1">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-all ${
              i < streak
                ? streak >= 12 ? "bg-orange-500" : streak >= 4 ? "bg-primary" : "bg-primary/60"
                : "bg-secondary"
            }`}
          />
        ))}
      </div>

      {nextMilestone && (
        <p className="text-xs text-muted-foreground font-sans">
          {nextMilestone.weeks - streak} more weeks to {nextMilestone.emoji} {nextMilestone.label}
        </p>
      )}
    </div>
  );
};

export default DateStreak;
