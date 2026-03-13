import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Clock, Heart, Star, Camera, MapPin, DollarSign,
  Calendar as CalendarIcon, TrendingUp, ImageIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface TimelineEntry {
  id: string;
  date: string;
  title: string;
  description: string | null;
  vibe: string | null;
  user_rating: number | null;
  is_favorite: boolean;
  photo_urls: string[] | null;
  estimated_cost: string | null;
  duration: string | null;
  yelp_rating: number | null;
  yelp_url: string | null;
  event_time: string | null;
}

const DateLog = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, avgRating: 0, totalPhotos: 0, favorites: 0 });

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data: link } = await supabase
      .from("partner_links").select("id").eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
    if (!link) { setLoading(false); return; }

    const { data } = await supabase
      .from("calendar_entries")
      .select("id, date, title, description, vibe, user_rating, is_favorite, photo_urls, estimated_cost, duration, yelp_rating, yelp_url, event_time")
      .eq("partner_link_id", link.id)
      .order("date", { ascending: false });

    if (data) {
      const typed = data as TimelineEntry[];
      setEntries(typed);

      const rated = typed.filter(e => e.user_rating);
      const photoCount = typed.reduce((sum, e) => sum + (e.photo_urls?.length || 0), 0);
      setStats({
        total: typed.length,
        avgRating: rated.length ? +(rated.reduce((s, e) => s + (e.user_rating || 0), 0) / rated.length).toFixed(1) : 0,
        totalPhotos: photoCount,
        favorites: typed.filter(e => e.is_favorite).length,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Group entries by month/year
  const grouped = entries.reduce<Record<string, TimelineEntry[]>>((acc, entry) => {
    const key = format(parseISO(entry.date), "MMMM yyyy");
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-6 mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
        <Skeleton className="h-12 w-48 mx-auto" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8 mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center">
          <Clock className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Date Log</h1>
        <p className="text-sm text-muted-foreground">Your complete date timeline</p>
      </div>

      {/* Stats Bar */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Dates", value: stats.total, icon: <CalendarIcon className="h-4 w-4" /> },
            { label: "Avg Rating", value: stats.avgRating ? `${stats.avgRating} ★` : "—", icon: <TrendingUp className="h-4 w-4" /> },
            { label: "Photos", value: stats.totalPhotos, icon: <Camera className="h-4 w-4" /> },
            { label: "Favorites", value: stats.favorites, icon: <Heart className="h-4 w-4" /> },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-3 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                {stat.icon}
                <span className="text-[10px] uppercase tracking-wider font-medium">{stat.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm text-muted-foreground">No dates logged yet. Add dates to your calendar to build your timeline!</p>
        </div>
      ) : (
        /* Timeline */
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 sm:left-5 top-0 bottom-0 w-px bg-border" />

          {Object.entries(grouped).map(([monthYear, monthEntries]) => (
            <div key={monthYear} className="mb-8">
              {/* Month header */}
              <div className="relative flex items-center gap-3 mb-4 pl-10 sm:pl-12">
                <div className="absolute left-2 sm:left-3 h-5 w-5 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center z-10">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary">{monthYear}</h2>
              </div>

              {monthEntries.map((entry) => (
                <div key={entry.id} className="relative pl-10 sm:pl-12 mb-5 group">
                  {/* Timeline dot */}
                  <div className="absolute left-[11px] sm:left-[15px] top-3 h-3 w-3 rounded-full bg-muted border-2 border-border group-hover:border-primary transition-colors z-10" />

                  <div className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors">
                    {/* Entry header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground flex items-center gap-2 truncate">
                          {entry.title}
                          {entry.is_favorite && <Heart className="h-3.5 w-3.5 flex-shrink-0 fill-red-400 text-red-400" />}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(entry.date), "EEEE, MMMM d")}
                          {entry.event_time && ` · ${entry.event_time}`}
                        </p>
                      </div>
                      {entry.user_rating && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {Array.from({ length: entry.user_rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Meta tags */}
                    <div className="flex flex-wrap gap-2">
                      {entry.vibe && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[11px] font-medium px-2 py-0.5">
                          ✨ {entry.vibe}
                        </span>
                      )}
                      {entry.estimated_cost && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground text-[11px] font-medium px-2 py-0.5">
                          <DollarSign className="h-3 w-3" /> {entry.estimated_cost}
                        </span>
                      )}
                      {entry.duration && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground text-[11px] font-medium px-2 py-0.5">
                          <Clock className="h-3 w-3" /> {entry.duration}
                        </span>
                      )}
                      {entry.yelp_rating && (
                        <a
                          href={entry.yelp_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground text-[11px] font-medium px-2 py-0.5 hover:text-primary transition-colors"
                        >
                          <MapPin className="h-3 w-3" /> Yelp {entry.yelp_rating}★
                        </a>
                      )}
                    </div>

                    {/* Description */}
                    {entry.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{entry.description}</p>
                    )}

                    {/* Photos */}
                    {entry.photo_urls && entry.photo_urls.length > 0 && (
                      <div className="grid grid-cols-4 gap-1.5">
                        {entry.photo_urls.map((url, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedPhoto(url)}
                            className="relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all hover:scale-[1.02]"
                          >
                            <img
                              src={url}
                              alt={`${entry.title} photo ${i + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt="Date memory"
            className="max-w-full max-h-[85vh] rounded-xl object-contain animate-scale-in"
          />
        </div>
      )}
    </div>
  );
};

export default DateLog;
