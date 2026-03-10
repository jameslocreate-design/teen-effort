import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Camera, Heart, Star, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { PhotoJournalSkeleton } from "@/components/ui/skeleton-card";

interface DateMemory {
  id: string;
  date: string;
  title: string;
  description: string | null;
  vibe: string | null;
  user_rating: number | null;
  is_favorite: boolean;
  photo_urls: string[] | null;
}

const PhotoJournal = () => {
  const { user } = useAuth();
  const [memories, setMemories] = useState<DateMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    if (!user) return;
    // Get partner link
    const { data: link } = await supabase
      .from("partner_links").select("id").eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
    if (!link) { setLoading(false); return; }

    const { data } = await supabase
      .from("calendar_entries")
      .select("id, date, title, description, vibe, user_rating, is_favorite, photo_urls")
      .eq("partner_link_id", link.id)
      .not("photo_urls", "eq", "{}")
      .order("date", { ascending: false });

    if (data) {
      // Filter entries that actually have photos
      setMemories((data as DateMemory[]).filter(d => d.photo_urls && d.photo_urls.length > 0));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  if (loading) return <PhotoJournalSkeleton />;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
          <Camera className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Photo Journal</h2>
        <p className="text-sm text-muted-foreground">Your date memories, beautifully preserved</p>
      </div>

      {memories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm text-muted-foreground">No photos yet! Add photos to your calendar dates to see them here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {memories.map((memory) => (
            <div key={memory.id} className="space-y-3 animate-fade-in">
              {/* Date header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    {memory.title}
                    {memory.is_favorite && <Heart className="h-3.5 w-3.5 fill-red-400 text-red-400" />}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(memory.date), "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {memory.user_rating && Array.from({ length: memory.user_rating }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                  ))}
                </div>
              </div>

              {memory.vibe && (
                <span className="inline-block rounded-full bg-primary/15 text-primary text-xs font-medium px-2.5 py-1">
                  ✨ {memory.vibe}
                </span>
              )}

              {/* Photo grid */}
              <div className="grid grid-cols-3 gap-2">
                {memory.photo_urls?.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPhoto(url)}
                    className="relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all hover:scale-[1.02]"
                  >
                    <img
                      src={url}
                      alt={`${memory.title} memory ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>

              {memory.description && (
                <p className="text-sm text-muted-foreground italic">"{memory.description}"</p>
              )}
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

export default PhotoJournal;
