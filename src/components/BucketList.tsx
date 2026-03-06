import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, Trash2, ListChecks, CircleDashed, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface BucketItem {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completed_at: string | null;
  added_by: string;
  created_at: string;
}

const BucketList = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<BucketItem[]>([]);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchLinkAndItems();
  }, [user]);

  const fetchLinkAndItems = async () => {
    if (!user) return;
    const { data: lid } = await supabase.rpc("get_accepted_partner_link_id", { _user_id: user.id });
    if (!lid) {
      setLinkId(null);
      setLoading(false);
      return;
    }
    setLinkId(lid);
    const { data } = await supabase
      .from("bucket_list")
      .select("*")
      .eq("partner_link_id", lid)
      .order("created_at", { ascending: true });
    setItems((data as BucketItem[]) || []);
    setLoading(false);
  };

  const addItem = async () => {
    if (!user || !linkId || !title.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("bucket_list").insert({
      partner_link_id: linkId,
      added_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
    });
    if (error) {
      toast.error("Failed to add item");
    } else {
      setTitle("");
      setDescription("");
      await fetchLinkAndItems();
      toast.success("Added to bucket list!");
    }
    setAdding(false);
  };

  const markComplete = async (id: string) => {
    const { error } = await supabase
      .from("bucket_list")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Failed to update");
    else await fetchLinkAndItems();
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("bucket_list").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else await fetchLinkAndItems();
  };

  if (loading) return <div className="text-center text-muted-foreground py-12">Loading…</div>;

  if (!linkId) {
    return (
      <div className="text-center py-16 space-y-3">
        <ListChecks className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground">Link with your partner first to create a shared bucket list.</p>
      </div>
    );
  }

  const todo = items.filter((i) => !i.completed);
  const completed = items.filter((i) => i.completed).sort(
    (a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()
  );

  return (
    <div className="space-y-8">
      {/* Add new */}
      <Card className="border-dashed">
        <CardContent className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Add to Bucket List
          </h3>
          <Input
            placeholder="e.g. Sunset picnic at the beach"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Optional description…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[60px]"
          />
          <Button onClick={addItem} disabled={adding || !title.trim()} size="sm" variant="send">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardContent>
      </Card>

      {/* To Do */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <CircleDashed className="h-5 w-5 text-primary" /> To Do
          <span className="text-xs font-normal text-muted-foreground">({todo.length})</span>
        </h2>
        {todo.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No items yet — add your first date idea above!
          </p>
        )}
        <div className="grid gap-2">
          {todo.map((item) => (
            <Card key={item.id} className="group">
              <CardContent className="p-4 flex items-start gap-3">
                <Button
                  onClick={() => markComplete(item.id)}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 text-xs"
                >
                  <Check className="h-3.5 w-3.5" /> Complete
                </Button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{item.title}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive h-8 w-8"
                  onClick={() => deleteItem(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Completed */}
      {completed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" /> Completed
            <span className="text-xs font-normal text-muted-foreground">({completed.length})</span>
          </h2>
          <div className="grid gap-2">
            {completed.map((item) => (
              <Card key={item.id} className="opacity-75">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground line-through">{item.title}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-through">{item.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed {new Date(item.completed_at!).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={() => deleteItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default BucketList;
