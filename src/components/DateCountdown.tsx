import { useState, useEffect } from "react";
import { CalendarDays, Clock, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, differenceInHours, differenceInMinutes, parseISO, isAfter, startOfDay } from "date-fns";

const DateCountdown = () => {
  const { user } = useAuth();
  const [nextDate, setNextDate] = useState<{ title: string; date: string; event_time: string | null } | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!user) return;
    const fetchNext = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("calendar_entries")
        .select("title, date, event_time")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) setNextDate(data);
    };
    fetchNext();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (!nextDate) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.15em] font-sans">Next Date</span>
        </div>
        <p className="text-sm text-muted-foreground/70 font-sans">
          No upcoming dates planned — time to schedule one!
        </p>
      </div>
    );
  }

  const targetDate = parseISO(nextDate.date);
  const isToday = startOfDay(now).getTime() === startOfDay(targetDate).getTime();
  const days = differenceInDays(targetDate, startOfDay(now));
  const totalHours = differenceInHours(targetDate, now);
  const totalMinutes = differenceInMinutes(targetDate, now);

  return (
    <div className="rounded-2xl border border-primary/20 bg-card p-5 space-y-3 glow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Heart className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.15em] font-sans">Next Date</span>
        </div>
        {nextDate.event_time && (
          <span className="text-xs text-muted-foreground font-sans flex items-center gap-1">
            <Clock className="h-3 w-3" /> {nextDate.event_time}
          </span>
        )}
      </div>

      <p className="text-base font-display font-semibold text-foreground">{nextDate.title}</p>

      <div className="flex items-center gap-4">
        {isToday ? (
          <span className="text-2xl font-display font-bold text-primary">Tonight!</span>
        ) : days <= 0 ? (
          <span className="text-2xl font-display font-bold text-primary">Tomorrow!</span>
        ) : (
          <>
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-primary">{days}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans">
                {days === 1 ? "day" : "days"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DateCountdown;
