import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, Send, Heart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";

const PROMPTS = [
  "What's one thing your partner did recently that made you smile?",
  "Describe your favorite memory together in one sentence.",
  "What quality do you admire most about your partner?",
  "What's something small your partner does that means the world to you?",
  "If you could relive one moment together, what would it be?",
  "What made you fall in love with your partner?",
  "What's a dream you'd love to chase together?",
  "How has your partner made you a better person?",
  "What's the funniest thing that's happened between you two?",
  "What are you most grateful for about your relationship?",
  "Describe your partner in three words — then explain why.",
  "What's one thing you want your partner to know today?",
  "What's a challenge you've overcome together that made you stronger?",
  "What do you love most about the way your partner loves you?",
  "What's the next adventure you want to go on together?",
];

interface Appreciation {
  id: string;
  prompt_text: string;
  response_text: string;
  sender_id: string;
  created_at: string;
}

const AppreciationPrompts = () => {
  const { user } = useAuth();
  const [linkId, setLinkId] = useState<string | null>(null);
  const [history, setHistory] = useState<Appreciation[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [sending, setSending] = useState(false);

  const pickPrompt = useCallback(() => {
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
    setResponse("");
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const { data: link } = await supabase
      .from("partner_links").select("id").eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
    if (!link) { setLoading(false); return; }
    setLinkId(link.id);

    const { data } = await supabase
      .from("appreciation_prompts")
      .select("*")
      .eq("partner_link_id", link.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (data) setHistory(data as Appreciation[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); pickPrompt(); }, [fetchData, pickPrompt]);

  const send = async () => {
    if (!user || !linkId || !response.trim()) return;
    setSending(true);
    const { error } = await supabase.from("appreciation_prompts").insert({
      partner_link_id: linkId,
      sender_id: user.id,
      prompt_text: prompt,
      response_text: response.trim(),
    });
    if (error) toast.error("Failed to send");
    else {
      toast.success("Appreciation sent! 💕");
      setResponse("");
      pickPrompt();
      fetchData();
    }
    setSending(false);
  };

  const isFromMe = (id: string) => id === user?.id;

  if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
          <Heart className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Partner Appreciation</h2>
        <p className="text-sm text-muted-foreground">Daily prompts to celebrate your love</p>
      </div>

      {!linkId ? (
        <p className="text-center text-sm text-muted-foreground py-8">Link with a partner to start appreciating each other!</p>
      ) : (
        <>
          {/* Today's prompt */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="text-sm font-medium text-foreground leading-snug">{prompt}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground" onClick={pickPrompt}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              placeholder="Write your appreciation..."
              value={response}
              onChange={e => setResponse(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <Button onClick={send} disabled={sending || !response.trim()} className="w-full rounded-xl gap-2">
              <Send className="h-4 w-4" />
              {sending ? "Sending..." : "Send to Partner"}
            </Button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recent Appreciations</h3>
              {history.map(item => (
                <div key={item.id} className={`bg-card border border-border rounded-2xl p-4 space-y-2 animate-fade-in ${isFromMe(item.sender_id) ? "ml-4" : "mr-4"}`}>
                  <p className="text-xs text-muted-foreground italic">"{item.prompt_text}"</p>
                  <p className="text-sm text-foreground">{item.response_text}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground/60">{format(new Date(item.created_at), "MMM d, yyyy · h:mm a")}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isFromMe(item.sender_id) ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                      {isFromMe(item.sender_id) ? "You" : "Partner"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AppreciationPrompts;
