import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Heart, Mail, MailOpen, Trash2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Letter {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const LoveLetters = () => {
  const { user } = useAuth();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [newLetter, setNewLetter] = useState("");
  const [partnerLinkId, setPartnerLinkId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchLink = async () => {
      const { data } = await supabase
        .from("partner_links").select("id").eq("status", "accepted")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
      if (data) {
        setPartnerLinkId(data.id);
        fetchLetters(data.id);
      }
    };
    fetchLink();
  }, [user]);

  const fetchLetters = async (linkId: string) => {
    const { data } = await supabase
      .from("love_letters")
      .select("*")
      .eq("partner_link_id", linkId)
      .order("created_at", { ascending: false });
    if (data) {
      setLetters(data);
      // Mark unread letters from partner as read
      const unread = data.filter((l) => l.sender_id !== user!.id && !l.is_read);
      for (const letter of unread) {
        await supabase.from("love_letters").update({ is_read: true }).eq("id", letter.id);
      }
    }
  };

  const handleSend = async () => {
    if (!newLetter.trim() || !partnerLinkId || !user) return;
    setSending(true);
    const { error } = await supabase.from("love_letters").insert({
      partner_link_id: partnerLinkId,
      sender_id: user.id,
      content: newLetter.trim(),
    });
    if (error) {
      toast.error("Failed to send letter");
    } else {
      toast.success("Love letter sent 💌");
      setNewLetter("");
      setComposing(false);
      fetchLetters(partnerLinkId);
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("love_letters").delete().eq("id", id);
    setLetters((prev) => prev.filter((l) => l.id !== id));
    toast.success("Letter deleted");
  };

  if (!partnerLinkId) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70 font-sans">Love Letters</p>
          <h1 className="text-3xl font-display font-semibold text-foreground">Private Notes</h1>
        </div>
        <p className="text-sm text-muted-foreground font-sans">Link with a partner first to exchange love letters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 animate-fade-in-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70 font-sans">Love Letters</p>
        <h1 className="text-3xl font-display font-semibold text-foreground">Private Notes</h1>
        <p className="text-sm text-muted-foreground font-sans">
          Write something sweet for your partner — only the two of you can see these.
        </p>
      </div>

      {!composing ? (
        <Button
          onClick={() => setComposing(true)}
          className="w-full rounded-2xl h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-sans"
        >
          <PenLine className="h-4 w-4" /> Write a Letter
        </Button>
      ) : (
        <div className="rounded-2xl border border-primary/20 bg-card p-4 space-y-3 glow-sm">
          <Textarea
            value={newLetter}
            onChange={(e) => setNewLetter(e.target.value)}
            placeholder="Dear love..."
            className="min-h-[120px] rounded-xl border-border bg-background font-sans text-sm resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setComposing(false); setNewLetter(""); }} className="font-sans text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSend} disabled={sending || !newLetter.trim()} className="rounded-xl font-sans text-xs">
              <Send className="h-3.5 w-3.5" /> {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {letters.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <Heart className="h-8 w-8 text-primary/30 mx-auto" />
            <p className="text-sm text-muted-foreground font-sans">No letters yet — write the first one!</p>
          </div>
        )}
        {letters.map((letter) => {
          const isFromMe = letter.sender_id === user?.id;
          return (
            <div
              key={letter.id}
              className={`rounded-2xl border p-4 space-y-2 transition-all ${
                isFromMe
                  ? "border-border bg-card/60 ml-6"
                  : "border-primary/15 bg-primary/5 mr-6 glow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
                  {isFromMe ? (
                    <Mail className="h-3.5 w-3.5" />
                  ) : (
                    <MailOpen className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span>{isFromMe ? "You wrote" : "From your partner"}</span>
                </div>
                <span className="text-[10px] text-muted-foreground/60 font-sans">
                  {formatDistanceToNow(new Date(letter.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-foreground font-sans leading-relaxed whitespace-pre-wrap">{letter.content}</p>
              {isFromMe && (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(letter.id)} className="text-muted-foreground hover:text-destructive h-7 text-xs">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LoveLetters;
