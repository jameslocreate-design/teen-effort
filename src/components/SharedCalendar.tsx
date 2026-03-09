import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trash2, CalendarDays } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, parseISO } from "date-fns";
import { toast } from "sonner";
import CalendarInsights from "@/components/CalendarInsights";

interface CalendarEntry {
  id: string;
  date: string;
  event_time: string | null;
  title: string;
  description: string | null;
  estimated_cost: string | null;
  duration: string | null;
  vibe: string | null;
  added_by: string;
}

interface SharedCalendarProps {
  onPlanDate?: (title: string, date: string) => void;
}

const SharedCalendar = ({ onPlanDate }: SharedCalendarProps) => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [totalDates, setTotalDates] = useState(0);
  const [partnerLinkId, setPartnerLinkId] = useState<string | null>(null);

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

  const fetchEntries = useCallback(async () => {
    if (!user || !partnerLinkId) return;
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const { data } = await supabase
      .from("calendar_entries")
      .select("*")
      .eq("partner_link_id", partnerLinkId)
      .gte("date", start)
      .lte("date", end);

    if (data) setEntries(data);
  }, [user, partnerLinkId, currentMonth]);

  const fetchTotalDates = useCallback(async () => {
    if (!partnerLinkId) return;
    const { count } = await supabase
      .from("calendar_entries")
      .select("id", { count: "exact", head: true })
      .eq("partner_link_id", partnerLinkId);
    setTotalDates(count ?? 0);
  }, [partnerLinkId]);

  useEffect(() => { fetchPartnerLink(); }, [fetchPartnerLink]);
  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { fetchTotalDates(); }, [fetchTotalDates]);

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from("calendar_entries").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setTotalDates((prev) => Math.max(0, prev - 1));
      toast.success("Removed from calendar");
    }
  };

  const handlePlanDate = (title: string, date: string) => {
    if (onPlanDate) {
      onPlanDate(title, date);
    } else {
      toast("Switch to the Plan tab to create a date idea!");
    }
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = startOfMonth(currentMonth).getDay();
  
  // Helper to compare dates safely without timezone issues
  const isSameDayAsEntry = (day: Date, entryDateStr: string) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return dayStr === entryDateStr;
  };
  
  const selectedEntries = selectedDate
    ? entries.filter((e) => isSameDayAsEntry(selectedDate, e.date))
    : [];

  if (!partnerLinkId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">No Partner Linked</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Link with your partner first to access your shared calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground">{format(currentMonth, "MMMM yyyy")}</h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-xs font-medium text-muted-foreground py-2">{d}</div>
        ))}

        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((day) => {
          const hasEntries = entries.some((e) => isSameDayAsEntry(day, e.date));
          const isSelected = selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(isSelected ? null : day)}
              className={`relative h-10 rounded-lg text-sm font-medium transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday(day)
                  ? "bg-secondary text-foreground"
                  : "text-foreground hover:bg-secondary/60"
              }`}
            >
              {format(day, "d")}
              {hasEntries && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date entries */}
      {selectedDate && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            {format(selectedDate, "EEEE, MMM d, yyyy")}
          </h3>
          {selectedEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dates planned. Add one from the Date Planner!</p>
          ) : (
            selectedEntries.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-foreground">{entry.title}</h4>
                  {entry.added_by === user?.id && (
                    <Button variant="ghost" size="icon" onClick={() => deleteEntry(entry.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {entry.description && <p className="text-sm text-muted-foreground">{entry.description}</p>}
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {entry.event_time && <span>🕐 {entry.event_time}</span>}
                  {entry.estimated_cost && <span>💰 {entry.estimated_cost}</span>}
                  {entry.duration && <span>⏱️ {entry.duration}</span>}
                  {entry.vibe && <span>✨ {entry.vibe}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Insights section */}
      <CalendarInsights
        partnerLinkId={partnerLinkId}
        totalDates={totalDates}
        onPlanDate={handlePlanDate}
      />
    </div>
  );
};

export default SharedCalendar;
