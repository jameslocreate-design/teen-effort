import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trash2, CalendarDays, Star, ExternalLink, Camera, Heart, ImageIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday } from "date-fns";
import { toast } from "sonner";
import CalendarInsights from "@/components/CalendarInsights";
import { CalendarSkeleton } from "@/components/ui/skeleton-card";

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
  yelp_url: string | null;
  yelp_rating: number | null;
  yelp_review_count: number | null;
  user_rating: number | null;
  is_favorite: boolean;
  photo_urls: string[] | null;
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
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoEntryId, setPhotoEntryId] = useState<string | null>(null);

  const fetchPartnerLink = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("partner_links").select("id").eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
    if (data) setPartnerLinkId(data.id);
    setLoading(false);
  }, [user]);

  const fetchEntries = useCallback(async () => {
    if (!user || !partnerLinkId) return;
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const { data } = await supabase
      .from("calendar_entries").select("*")
      .eq("partner_link_id", partnerLinkId)
      .gte("date", start).lte("date", end);
    if (data) setEntries(data as CalendarEntry[]);
  }, [user, partnerLinkId, currentMonth]);

  const fetchTotalDates = useCallback(async () => {
    if (!partnerLinkId) return;
    const { count } = await supabase
      .from("calendar_entries").select("id", { count: "exact", head: true })
      .eq("partner_link_id", partnerLinkId);
    setTotalDates(count ?? 0);
  }, [partnerLinkId]);

  useEffect(() => { fetchPartnerLink(); }, [fetchPartnerLink]);
  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { fetchTotalDates(); }, [fetchTotalDates]);

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from("calendar_entries").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setTotalDates((prev) => Math.max(0, prev - 1));
      toast.success("Removed from calendar");
    }
  };

  const toggleFavorite = async (entry: CalendarEntry) => {
    const { error } = await supabase
      .from("calendar_entries").update({ is_favorite: !entry.is_favorite }).eq("id", entry.id);
    if (!error) {
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, is_favorite: !e.is_favorite } : e));
    }
  };

  const setRating = async (entryId: string, rating: number) => {
    const { error } = await supabase
      .from("calendar_entries").update({ user_rating: rating }).eq("id", entryId);
    if (!error) {
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, user_rating: rating } : e));
      toast.success("Rating saved!");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoEntryId || !user) return;
    setUploadingId(photoEntryId);

    const ext = file.name.split('.').pop();
    const path = `${user.id}/${photoEntryId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("date-photos").upload(path, file);

    if (uploadError) {
      toast.error("Failed to upload photo");
      setUploadingId(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("date-photos").getPublicUrl(path);
    const entry = entries.find(e => e.id === photoEntryId);
    const currentPhotos = entry?.photo_urls || [];
    const newPhotos = [...currentPhotos, urlData.publicUrl];

    const { error: updateError } = await supabase
      .from("calendar_entries").update({ photo_urls: newPhotos }).eq("id", photoEntryId);

    if (!updateError) {
      setEntries(prev => prev.map(e => e.id === photoEntryId ? { ...e, photo_urls: newPhotos } : e));
      toast.success("Photo added!");
    }
    setUploadingId(null);
    setPhotoEntryId(null);
  };

  const handlePlanDate = (title: string, date: string) => {
    if (onPlanDate) onPlanDate(title, date);
    else toast("Switch to the Plan tab to create a date idea!");
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = startOfMonth(currentMonth).getDay();

  const isSameDayAsEntry = (day: Date, entryDateStr: string) => format(day, "yyyy-MM-dd") === entryDateStr;

  const selectedEntries = selectedDate
    ? entries.filter((e) => isSameDayAsEntry(selectedDate, e.date))
    : [];

  if (loading) return <CalendarSkeleton />;

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
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

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
        {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {days.map((day) => {
          const dayEntries = entries.filter((e) => isSameDayAsEntry(day, e.date));
          const hasEntries = dayEntries.length > 0;
          const hasFavorite = dayEntries.some(e => e.is_favorite);
          const isSelected = selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(isSelected ? null : day)}
              className={`relative h-10 rounded-lg text-sm font-medium transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday(day) ? "bg-secondary text-foreground"
                  : "text-foreground hover:bg-secondary/60"
              }`}
            >
              {format(day, "d")}
              {hasEntries && (
                <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full ${hasFavorite ? "bg-red-400" : "bg-primary"}`} />
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
              <div key={entry.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{entry.title}</h4>
                      {entry.is_favorite && <Heart className="h-3.5 w-3.5 fill-red-400 text-red-400" />}
                    </div>
                    {entry.event_time && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary text-xs font-semibold px-2.5 py-1">
                          🕐 {(() => {
                            const [h, m] = entry.event_time.split(":").map(Number);
                            const period = h >= 12 ? "PM" : "AM";
                            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                            return `${h12}:${String(m).padStart(2, "0")} ${period}`;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFavorite(entry)}
                      className={`h-7 w-7 ${entry.is_favorite ? "text-red-400" : "text-muted-foreground"}`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${entry.is_favorite ? "fill-current" : ""}`} />
                    </Button>
                    {entry.added_by === user?.id && (
                      <Button variant="ghost" size="icon" onClick={() => deleteEntry(entry.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {entry.description && <p className="text-sm text-muted-foreground">{entry.description}</p>}

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {entry.yelp_rating && (
                    <span className="flex items-center gap-1 text-yellow-500 font-medium">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {entry.yelp_rating}
                      {entry.yelp_review_count && <span className="text-muted-foreground font-normal">({entry.yelp_review_count})</span>}
                    </span>
                  )}
                  {entry.estimated_cost && <span>💰 {entry.estimated_cost}</span>}
                  {entry.duration && <span>⏱️ {entry.duration}</span>}
                  {entry.vibe && <span>✨ {entry.vibe}</span>}
                </div>

                {/* User Rating */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Rate:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(entry.id, star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          entry.user_rating && star <= entry.user_rating
                            ? "fill-primary text-primary"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Photo memories */}
                {entry.photo_urls && entry.photo_urls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {entry.photo_urls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Date memory ${i + 1}`}
                        className="h-20 w-20 rounded-lg object-cover flex-shrink-0 border border-border"
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {entry.yelp_url && (
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 gap-1.5 text-xs px-2"
                      onClick={() => window.open(entry.yelp_url!, "_blank")}
                    >
                      View on Yelp <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 gap-1.5 text-xs px-2"
                    disabled={uploadingId === entry.id}
                    onClick={() => {
                      setPhotoEntryId(entry.id);
                      fileInputRef.current?.click();
                    }}
                  >
                    {uploadingId === entry.id ? (
                      "Uploading..."
                    ) : (
                      <><Camera className="h-3 w-3" /> Add Photo</>
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <CalendarInsights
        partnerLinkId={partnerLinkId}
        totalDates={totalDates}
        onPlanDate={handlePlanDate}
      />
    </div>
  );
};

export default SharedCalendar;
