import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Star, MessageSquare, Plus, Trash2, ThumbsUp, MapPin } from "lucide-react";

interface Review {
  id: string;
  user_id: string;
  venue_name: string;
  venue_type: string | null;
  location: string | null;
  rating: number;
  review_text: string | null;
  date_type: string | null;
  cost_range: string | null;
  would_recommend: boolean;
  created_at: string;
}

const VENUE_TYPES = ["Restaurant", "Bar/Lounge", "Park", "Museum", "Theater", "Café", "Activity Center", "Other"];
const DATE_TYPES = ["First Date", "Anniversary", "Casual", "Special Occasion", "Double Date"];
const COST_RANGES = ["Free", "$1–$25", "$25–$50", "$50–$100", "$100+"];

const DateReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    venue_name: "", venue_type: "", location: "",
    rating: 5, review_text: "", date_type: "",
    cost_range: "", would_recommend: true,
  });

  const fetchReviews = useCallback(async () => {
    const { data } = await supabase
      .from("date_reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setReviews(data as Review[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleSubmit = async () => {
    if (!user || !form.venue_name.trim()) {
      toast.error("Please enter a venue name");
      return;
    }
    const { error } = await supabase.from("date_reviews").insert({
      user_id: user.id,
      venue_name: form.venue_name.trim(),
      venue_type: form.venue_type || null,
      location: form.location.trim() || null,
      rating: form.rating,
      review_text: form.review_text.trim() || null,
      date_type: form.date_type || null,
      cost_range: form.cost_range || null,
      would_recommend: form.would_recommend,
    } as any);

    if (error) toast.error("Failed to post review");
    else {
      toast.success("Review posted! 🎉");
      setShowForm(false);
      setForm({ venue_name: "", venue_type: "", location: "", rating: 5, review_text: "", date_type: "", cost_range: "", would_recommend: true });
      fetchReviews();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("date_reviews").delete().eq("id", id);
    if (!error) {
      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success("Review deleted");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center animate-pulse">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Date Reviews</h2>
        <p className="text-sm text-muted-foreground">Share & discover the best date spots</p>
      </div>

      <Button onClick={() => setShowForm(!showForm)} className="w-full gap-2">
        <Plus className="h-4 w-4" /> Write a Review
      </Button>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4 animate-fade-in">
          <Input
            placeholder="Venue name *"
            value={form.venue_name}
            onChange={e => setForm(prev => ({ ...prev, venue_name: e.target.value }))}
            className="bg-secondary/50 border-border"
          />
          <Input
            placeholder="Location (city, neighborhood)"
            value={form.location}
            onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
            className="bg-secondary/50 border-border"
          />

          {/* Venue type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Venue Type</label>
            <div className="flex flex-wrap gap-1.5">
              {VENUE_TYPES.map(t => (
                <button key={t} onClick={() => setForm(prev => ({ ...prev, venue_type: prev.venue_type === t ? "" : t }))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    form.venue_type === t ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-secondary/40 text-secondary-foreground"
                  }`}>{t}</button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setForm(prev => ({ ...prev, rating: s }))}>
                  <Star className={`h-6 w-6 transition-all ${s <= form.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Date type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date Type</label>
            <div className="flex flex-wrap gap-1.5">
              {DATE_TYPES.map(t => (
                <button key={t} onClick={() => setForm(prev => ({ ...prev, date_type: prev.date_type === t ? "" : t }))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    form.date_type === t ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-secondary/40 text-secondary-foreground"
                  }`}>{t}</button>
              ))}
            </div>
          </div>

          {/* Cost */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cost Range</label>
            <div className="flex flex-wrap gap-1.5">
              {COST_RANGES.map(c => (
                <button key={c} onClick={() => setForm(prev => ({ ...prev, cost_range: prev.cost_range === c ? "" : c }))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    form.cost_range === c ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-secondary/40 text-secondary-foreground"
                  }`}>{c}</button>
              ))}
            </div>
          </div>

          <Textarea
            placeholder="Tell other couples about your experience..."
            value={form.review_text}
            onChange={e => setForm(prev => ({ ...prev, review_text: e.target.value }))}
            rows={3}
            className="bg-secondary/50 border-border"
          />

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <button
              onClick={() => setForm(prev => ({ ...prev, would_recommend: !prev.would_recommend }))}
              className={`h-5 w-5 rounded border transition-all flex items-center justify-center ${
                form.would_recommend ? "bg-primary border-primary" : "border-border"
              }`}
            >
              {form.would_recommend && <ThumbsUp className="h-3 w-3 text-primary-foreground" />}
            </button>
            Would recommend for a date
          </label>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1">Post Review</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No reviews yet — be the first to share a date spot!
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <div key={review.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">{review.venue_name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-primary text-primary" : "text-muted-foreground/20"}`} />
                      ))}
                    </div>
                    {review.would_recommend && (
                      <span className="flex items-center gap-0.5 text-[10px] text-primary font-medium">
                        <ThumbsUp className="h-2.5 w-2.5" /> Recommended
                      </span>
                    )}
                  </div>
                </div>
                {review.user_id === user?.id && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(review.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {review.location && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {review.location}
                  </span>
                )}
                {review.venue_type && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{review.venue_type}</span>
                )}
                {review.date_type && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{review.date_type}</span>
                )}
                {review.cost_range && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">💰 {review.cost_range}</span>
                )}
              </div>

              {review.review_text && (
                <p className="text-sm text-muted-foreground">{review.review_text}</p>
              )}

              <p className="text-[10px] text-muted-foreground/60">
                {new Date(review.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DateReviews;
