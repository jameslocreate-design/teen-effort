import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Heart, Gift, Star, Sparkles, Plus, Trash2, Calendar, PartyPopper, GraduationCap,
} from "lucide-react";
import { format, differenceInDays, isBefore, addYears, setYear } from "date-fns";
import { toast } from "sonner";

interface SpecialEvent {
  id: string;
  title: string;
  event_date: string;
  recurring: boolean;
  event_type: string;
  added_by: string;
  is_birthday?: boolean;
}

const SEASONAL_DATES = [
  { title: "Valentine's Day", date: "02-14", icon: <Heart className="h-4 w-4" />, color: "text-red-400" },
  { title: "Prom Season", date: "05-01", icon: <PartyPopper className="h-4 w-4" />, color: "text-pink-400" },
  { title: "Homecoming", date: "10-01", icon: <GraduationCap className="h-4 w-4" />, color: "text-amber-400" },
  { title: "New Year's Eve", date: "12-31", icon: <Sparkles className="h-4 w-4" />, color: "text-yellow-400" },
];

const eventTypeIcons: Record<string, React.ReactNode> = {
  anniversary: <Heart className="h-4 w-4" />,
  birthday: <Gift className="h-4 w-4" />,
  custom: <Star className="h-4 w-4" />,
};

interface Props {
  partnerLinkId: string;
  totalDates: number;
  onPlanDate: (title: string, date: string) => void;
}

const CalendarInsights = ({ partnerLinkId, totalDates, onPlanDate }: Props) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState("custom");

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    
    // Fetch manual special events
    const { data: manualEvents } = await supabase
      .from("special_events")
      .select("*")
      .eq("partner_link_id", partnerLinkId);
    
    // Fetch partner link to get both user IDs
    const { data: linkData } = await supabase
      .from("partner_links")
      .select("user1_id, user2_id")
      .eq("id", partnerLinkId)
      .single();
    
    const allEvents: SpecialEvent[] = [...(manualEvents || [])];
    
    // Fetch birthdays for both users
    if (linkData) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, birthday")
        .in("user_id", [linkData.user1_id, linkData.user2_id]);
      
      if (profiles) {
        profiles.forEach((profile) => {
          if (profile.birthday) {
            allEvents.push({
              id: `birthday-${profile.user_id}`,
              title: `${profile.name}'s Birthday`,
              event_date: profile.birthday,
              recurring: true,
              event_type: "birthday",
              added_by: profile.user_id,
              is_birthday: true,
            });
          }
        });
      }
    }
    
    setEvents(allEvents);
  }, [partnerLinkId, user]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const addEvent = async () => {
    if (!user || !newTitle.trim() || !newDate) {
      toast.error("Please fill in all fields");
      return;
    }
    const { error } = await supabase.from("special_events").insert({
      partner_link_id: partnerLinkId,
      added_by: user.id,
      title: newTitle.trim(),
      event_date: newDate,
      event_type: newType,
      recurring: true,
    } as any);
    if (error) {
      toast.error("Failed to add event");
    } else {
      toast.success("Event added!");
      setNewTitle("");
      setNewDate("");
      setNewType("custom");
      setShowAddForm(false);
      fetchEvents();
    }
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from("special_events").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const getNextOccurrence = (dateStr: string) => {
    const today = new Date();
    // Parse date string as local date to avoid timezone shifts
    const [year, month, day] = dateStr.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day);
    let next = setYear(eventDate, today.getFullYear());
    if (isBefore(next, today)) next = addYears(next, 1);
    return next;
  };

  const getUpcomingSeasonal = () => {
    const today = new Date();
    const year = today.getFullYear();
    return SEASONAL_DATES.map((s) => {
      let next = new Date(`${year}-${s.date}`);
      if (isBefore(next, today)) next = new Date(`${year + 1}-${s.date}`);
      const daysUntil = differenceInDays(next, today);
      return { ...s, next, daysUntil };
    })
      .filter((s) => s.daysUntil <= 90)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const upcomingSeasonal = getUpcomingSeasonal();
  const sortedEvents = [...events].sort((a, b) => {
    const nextA = getNextOccurrence(a.event_date);
    const nextB = getNextOccurrence(b.event_date);
    return nextA.getTime() - nextB.getTime();
  });

  const eventTypes = [
    { value: "anniversary", label: "Anniversary", icon: "💍" },
    { value: "birthday", label: "Birthday", icon: "🎂" },
    { value: "custom", label: "Other", icon: "⭐" },
  ];

  return (
    <div className="space-y-6 mt-8 pt-8 border-t border-border">
      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex-1 rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totalDates}</p>
          <p className="text-xs text-muted-foreground mt-1">Dates Planned</p>
        </div>
        <div className="flex-1 rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{events.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Special Events</p>
        </div>
      </div>

      {/* Upcoming seasonal events */}
      {upcomingSeasonal.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Upcoming — Plan a Date!
          </h3>
          {upcomingSeasonal.map((s) => (
            <div
              key={s.title}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <span className={s.color}>{s.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.daysUntil === 0 ? "Today!" : `In ${s.daysUntil} days`} · {format(s.next, "MMM d")}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs rounded-lg"
                onClick={() => onPlanDate(s.title, format(s.next, "yyyy-MM-dd"))}
              >
                <Calendar className="h-3.5 w-3.5" />
                Plan Date
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Special recurring events */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Special Events
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs h-7"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {showAddForm && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Event name (e.g. Our Anniversary)"
              className="bg-secondary/50 border-border"
            />
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="bg-secondary/50 border-border"
            />
            <div className="flex gap-2">
              {eventTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setNewType(t.value)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    newType === t.value
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border bg-secondary/40 text-secondary-foreground"
                  }`}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addEvent} className="rounded-lg text-xs">
                Save Event
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {sortedEvents.length === 0 && !showAddForm ? (
          <p className="text-sm text-muted-foreground">
            No special events yet. Add anniversaries, birthdays, and more!
          </p>
        ) : (
          sortedEvents.map((event) => {
            const next = getNextOccurrence(event.event_date);
            const daysUntil = differenceInDays(next, new Date());
            return (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-primary">
                    {eventTypeIcons[event.event_type] || eventTypeIcons.custom}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(next, "MMM d")} · {daysUntil === 0 ? "Today!" : `In ${daysUntil} days`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-lg"
                    onClick={() => onPlanDate(event.title, format(next, "yyyy-MM-dd"))}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Plan
                  </Button>
                  {event.added_by === user?.id && !event.is_birthday && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEvent(event.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CalendarInsights;
