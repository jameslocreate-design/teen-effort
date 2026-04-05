import { useState, useEffect } from "react";
import { Heart, Calendar, Camera, PenLine, Star, MapPin, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";

interface TimelineEvent {
  id: string;
  type: "date" | "letter" | "milestone" | "photo" | "event";
  title: string;
  description?: string;
  date: string;
  icon: React.ReactNode;
  color: string;
  meta?: Record<string, any>;
}

const RelationshipTimeline = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const { data: link } = await supabase
        .from("partner_links").select("id, created_at").eq("status", "accepted")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
      if (!link) { setLoading(false); return; }

      const [calRes, letterRes, eventRes] = await Promise.all([
        supabase.from("calendar_entries")
          .select("id, title, description, date, vibe, user_rating, photo_urls, estimated_cost")
          .eq("partner_link_id", link.id).order("date", { ascending: false }),
        supabase.from("love_letters")
          .select("id, content, created_at, sender_id")
          .eq("partner_link_id", link.id).order("created_at", { ascending: false }),
        supabase.from("special_events")
          .select("id, title, event_date, event_type")
          .eq("partner_link_id", link.id).order("event_date", { ascending: false }),
      ]);

      const timeline: TimelineEvent[] = [];

      // Partner link milestone
      timeline.push({
        id: "link-" + link.id,
        type: "milestone",
        title: "Partners linked! 💕",
        date: link.created_at,
        icon: <Heart className="h-4 w-4" />,
        color: "text-pink-500",
      });

      // Calendar entries
      (calRes.data || []).forEach(e => {
        const hasPhotos = e.photo_urls && e.photo_urls.length > 0;
        timeline.push({
          id: "date-" + e.id,
          type: hasPhotos ? "photo" : "date",
          title: e.title,
          description: e.description || undefined,
          date: e.date + "T00:00:00Z",
          icon: hasPhotos ? <Camera className="h-4 w-4" /> : <Calendar className="h-4 w-4" />,
          color: hasPhotos ? "text-purple-500" : "text-blue-500",
          meta: { vibe: e.vibe, rating: e.user_rating, cost: e.estimated_cost, photoCount: e.photo_urls?.length || 0 },
        });
      });

      // Love letters
      (letterRes.data || []).forEach(l => {
        timeline.push({
          id: "letter-" + l.id,
          type: "letter",
          title: "Love Letter",
          description: l.content.slice(0, 100) + (l.content.length > 100 ? "..." : ""),
          date: l.created_at,
          icon: <PenLine className="h-4 w-4" />,
          color: "text-rose-500",
          meta: { fromYou: l.sender_id === user.id },
        });
      });

      // Special events
      (eventRes.data || []).forEach(e => {
        timeline.push({
          id: "event-" + e.id,
          type: "event",
          title: e.title,
          date: e.event_date + "T00:00:00Z",
          icon: <Trophy className="h-4 w-4" />,
          color: "text-amber-500",
          meta: { type: e.event_type },
        });
      });

      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents(timeline);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70 font-sans">Your Story</p>
          <h2 className="text-2xl font-display font-semibold text-foreground">Relationship Timeline</h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-secondary/50" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70 font-sans">Your Story</p>
        <h2 className="text-2xl font-display font-semibold text-foreground">Relationship Timeline</h2>
        <p className="text-sm text-muted-foreground font-sans">{events.length} moments together</p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/60 p-8 text-center">
          <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground font-sans">Start creating memories together!</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {events.map((event, i) => {
              const isNewMonth = i === 0 || format(parseISO(event.date), "MMM yyyy") !== format(parseISO(events[i - 1].date), "MMM yyyy");
              return (
                <div key={event.id}>
                  {isNewMonth && (
                    <div className="flex items-center gap-3 mb-3 pl-10">
                      <span className="text-xs font-semibold text-primary font-sans uppercase tracking-wider">
                        {format(parseISO(event.date), "MMMM yyyy")}
                      </span>
                      <div className="flex-1 h-px bg-primary/20" />
                    </div>
                  )}
                  <div className="relative flex gap-4 pl-1">
                    {/* Dot */}
                    <div className={`relative z-10 flex-shrink-0 h-8 w-8 rounded-full border-2 border-background bg-card flex items-center justify-center ${event.color}`}>
                      {event.icon}
                    </div>
                    {/* Content */}
                    <div className="flex-1 rounded-xl border border-border bg-card/60 p-4 space-y-1.5">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-semibold text-foreground font-sans">{event.title}</h4>
                        <span className="text-[10px] text-muted-foreground font-sans">
                          {format(parseISO(event.date), "MMM d")}
                        </span>
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground font-sans leading-relaxed">{event.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {event.meta?.vibe && (
                          <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground font-sans">{event.meta.vibe}</span>
                        )}
                        {event.meta?.rating && (
                          <span className="text-[10px] flex items-center gap-0.5 text-yellow-500 font-sans">
                            <Star className="h-2.5 w-2.5 fill-yellow-500" /> {event.meta.rating}/5
                          </span>
                        )}
                        {event.meta?.photoCount > 0 && (
                          <span className="text-[10px] text-muted-foreground font-sans">📸 {event.meta.photoCount} photos</span>
                        )}
                        {event.meta?.fromYou !== undefined && (
                          <span className="text-[10px] text-muted-foreground font-sans">
                            {event.meta.fromYou ? "From you" : "From partner"} 💌
                          </span>
                        )}
                        {event.meta?.cost && (
                          <span className="text-[10px] text-muted-foreground font-sans">💰 {event.meta.cost}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RelationshipTimeline;
