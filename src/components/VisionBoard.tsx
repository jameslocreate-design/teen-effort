import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, Plus, Trash2, MapPin, Heart, Star, Utensils, Plane, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";

interface Pin {
  id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string | null;
  added_by: string;
  created_at: string;
}

const CATEGORIES = [
  { id: "dream_date", label: "Dream Date", icon: <Heart className="h-3.5 w-3.5" /> },
  { id: "travel", label: "Travel", icon: <Plane className="h-3.5 w-3.5" /> },
  { id: "restaurant", label: "Restaurant", icon: <Utensils className="h-3.5 w-3.5" /> },
  { id: "goal", label: "Goal", icon: <Star className="h-3.5 w-3.5" /> },
  { id: "adventure", label: "Adventure", icon: <MapPin className="h-3.5 w-3.5" /> },
];

const VisionBoard = () => {
  const { user } = useAuth();
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("dream_date");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const fetchPins = useCallback(async () => {
    if (!user) return;
    const { data: link } = await supabase
      .from("partner_links").select("id").eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
    if (!link) { setLoading(false); return; }
    setLinkId(link.id);

    const { data } = await supabase
      .from("vision_board_pins")
      .select("*")
      .eq("partner_link_id", link.id)
      .order("created_at", { ascending: false });

    if (data) setPins(data as Pin[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPins(); }, [fetchPins]);

  const addPin = async () => {
    if (!user || !linkId || !title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("vision_board_pins").insert({
      partner_link_id: linkId,
      added_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
      category,
      image_url: imageUrl.trim() || null,
    });
    if (error) { toast.error("Failed to add pin"); }
    else {
      toast.success("Pin added to vision board! ✨");
      setTitle(""); setDescription(""); setImageUrl(""); setShowForm(false);
      fetchPins();
    }
    setSaving(false);
  };

  const deletePin = async (id: string) => {
    await supabase.from("vision_board_pins").delete().eq("id", id);
    setPins(prev => prev.filter(p => p.id !== id));
    toast.success("Pin removed");
  };

  const filtered = filter ? pins.filter(p => p.category === filter) : pins;
  const catInfo = (id: string) => CATEGORIES.find(c => c.id === id);

  if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
          <Eye className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Vision Board</h2>
        <p className="text-sm text-muted-foreground">Pin your dreams, destinations & goals together</p>
      </div>

      {!linkId ? (
        <p className="text-center text-sm text-muted-foreground py-8">Link with a partner to use the vision board!</p>
      ) : (
        <>
          {/* Category filter */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={() => setFilter(null)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!filter ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              All
            </button>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setFilter(c.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${filter === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {/* Add form */}
          {showForm ? (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-foreground">Add a Pin</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
              </div>
              <Input placeholder="Title (e.g. 'Santorini trip')" value={title} onChange={e => setTitle(e.target.value)} />
              <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
              <Input placeholder="Image URL (optional)" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${category === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
              <Button onClick={addPin} disabled={saving || !title.trim()} className="w-full rounded-xl">
                {saving ? "Adding..." : "Add Pin"}
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowForm(true)} className="w-full rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Add to Vision Board
            </Button>
          )}

          {/* Pins grid */}
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No pins yet — start dreaming together!</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(pin => {
                const cat = catInfo(pin.category);
                return (
                  <div key={pin.id} className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all animate-fade-in">
                    {pin.image_url && (
                      <div className="aspect-[4/3] overflow-hidden">
                        <img src={pin.image_url} alt={pin.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    )}
                    <div className="p-3 space-y-1.5">
                      {cat && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5">
                          {cat.icon} {cat.label}
                        </span>
                      )}
                      <h4 className="text-sm font-semibold text-foreground leading-tight">{pin.title}</h4>
                      {pin.description && <p className="text-xs text-muted-foreground line-clamp-2">{pin.description}</p>}
                      <p className="text-[10px] text-muted-foreground/60">{format(new Date(pin.created_at), "MMM d, yyyy")}</p>
                    </div>
                    {pin.added_by === user?.id && (
                      <button onClick={() => deletePin(pin.id)} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VisionBoard;
