import { useState, useEffect, useCallback } from "react";
import { demoSelect, demoInsert, demoDelete } from "@/lib/demo-db";
import { DEMO_LINK_ID, DEMO_PARTNER_ID } from "@/lib/demo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Gift, Plus, Trash2, ExternalLink, Eye, EyeOff, Link2 } from "lucide-react";

interface WishlistItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  url: string | null;
  created_at: string;
}

const SharedWishlists = () => {
  const { user } = useAuth();
  const [partnerLinkId, setPartnerLinkId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [myItems, setMyItems] = useState<WishlistItem[]>([]);
  const [partnerItems, setPartnerItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPartner, setShowPartner] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setPartnerLinkId(DEMO_LINK_ID);
    setPartnerId(DEMO_PARTNER_ID);
    const items = demoSelect<any>("wishlists").slice().reverse() as WishlistItem[];
    setMyItems(items.filter(i => i.user_id === user.id));
    setPartnerItems(items.filter(i => i.user_id === DEMO_PARTNER_ID));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!user || !newTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }
    const created = demoInsert<any>("wishlists", {
      user_id: user.id,
      partner_link_id: DEMO_LINK_ID,
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      url: newUrl.trim() || null,
    } as any);
    setMyItems(prev => [created as WishlistItem, ...prev]);
    setNewTitle(""); setNewDesc(""); setNewUrl("");
    setAddingNew(false);
    toast.success("Added to your wishlist!");
  };

  const handleDelete = async (id: string) => {
    demoDelete("wishlists", id);
    setMyItems(prev => prev.filter(i => i.id !== id));
    toast.success("Removed from wishlist");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center animate-pulse">
          <Gift className="h-5 w-5 text-primary" />
        </div>
      </div>
    );
  }

  if (!partnerLinkId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">No Partner Linked</h2>
        <p className="text-sm text-muted-foreground max-w-xs">Link with your partner first to share wishlists.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
          <Gift className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Wishlists</h2>
        <p className="text-sm text-muted-foreground">Add items you'd love — your partner can peek! 👀</p>
      </div>

      {/* My Wishlist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">My Wishlist</h3>
          <Button variant="outline" size="sm" onClick={() => setAddingNew(!addingNew)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>

        {addingNew && (
          <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3 animate-fade-in">
            <Input
              placeholder="What do you want?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="bg-secondary/50 border-border"
            />
            <Textarea
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              className="bg-secondary/50 border-border"
            />
            <Input
              placeholder="Link/URL (optional)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="bg-secondary/50 border-border"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>Save</Button>
              <Button variant="ghost" size="sm" onClick={() => setAddingNew(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {myItems.length === 0 && !addingNew ? (
          <p className="text-sm text-muted-foreground text-center py-4">Your wishlist is empty — add something!</p>
        ) : (
          myItems.map(item => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-start justify-between">
                <h4 className="font-semibold text-foreground text-sm">{item.title}</h4>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> View Link
                </a>
              )}
            </div>
          ))
        )}
      </div>

      {/* Partner's Wishlist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Partner's Wishlist</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowPartner(!showPartner)} className="gap-1.5 text-xs">
            {showPartner ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPartner ? "Hide" : "Peek"}
          </Button>
        </div>

        {!showPartner ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Eye className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Click "Peek" to see what your partner wants!</p>
          </div>
        ) : partnerItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Your partner hasn't added anything yet.</p>
        ) : (
          partnerItems.map(item => (
            <div key={item.id} className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1 animate-fade-in">
              <h4 className="font-semibold text-foreground text-sm">🎁 {item.title}</h4>
              {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> View Link
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SharedWishlists;
