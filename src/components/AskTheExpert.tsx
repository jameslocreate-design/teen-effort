import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Sparkles, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Post {
  id: string;
  user_id: string;
  content: string;
  anonymous_name: string;
  created_at: string;
}

interface Reply {
  id: string;
  post_id: string;
  user_id: string | null;
  content: string;
  is_ai: boolean;
  anonymous_name: string;
  created_at: string;
}

const AskTheExpert = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [posting, setPosting] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [loadingAI, setLoadingAI] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel("expert-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "expert_posts" }, () => fetchPosts())
      .on("postgres_changes", { event: "*", schema: "public", table: "expert_replies" }, (payload: any) => {
        const postId = payload.new?.post_id || payload.old?.post_id;
        if (postId) fetchReplies(postId);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("expert_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setPosts(data);
  };

  const fetchReplies = async (postId: string) => {
    const { data, error } = await supabase
      .from("expert_replies")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (!error && data) {
      setReplies((prev) => ({ ...prev, [postId]: data }));
    }
  };

  const createPost = async () => {
    if (!newQuestion.trim() || !user) return;
    setPosting(true);
    const { error } = await supabase.from("expert_posts").insert({
      user_id: user.id,
      content: newQuestion.trim(),
      anonymous_name: `Anonymous ${Math.floor(Math.random() * 9000) + 1000}`,
    });
    if (error) {
      toast.error("Failed to post question");
    } else {
      setNewQuestion("");
      toast.success("Question posted!");
    }
    setPosting(false);
  };

  const toggleExpand = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      if (!replies[postId]) fetchReplies(postId);
    }
  };

  const submitReply = async (postId: string) => {
    const text = replyText[postId]?.trim();
    if (!text || !user) return;
    setReplyingTo((p) => ({ ...p, [postId]: true }));
    const { error } = await supabase.from("expert_replies").insert({
      post_id: postId,
      user_id: user.id,
      content: text,
      anonymous_name: `Anonymous ${Math.floor(Math.random() * 9000) + 1000}`,
    });
    if (error) {
      toast.error("Failed to post reply");
    } else {
      setReplyText((p) => ({ ...p, [postId]: "" }));
    }
    setReplyingTo((p) => ({ ...p, [postId]: false }));
  };

  const askAI = async (post: Post) => {
    setLoadingAI((p) => ({ ...p, [post.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("expert-advice", {
        body: { question: post.content },
      });
      if (error) throw error;
      if (data?.advice) {
        await supabase.from("expert_replies").insert({
          post_id: post.id,
          user_id: user!.id,
          content: data.advice,
          is_ai: true,
          anonymous_name: "AI Expert 🤖",
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to get AI advice");
    }
    setLoadingAI((p) => ({ ...p, [post.id]: false }));
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from("expert_posts").delete().eq("id", postId);
    if (error) toast.error("Failed to delete");
  };

  const deleteReply = async (replyId: string) => {
    const { error } = await supabase.from("expert_replies").delete().eq("id", replyId);
    if (error) toast.error("Failed to delete");
  };

  const postReplies = (postId: string) => replies[postId] || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Ask the Expert</h2>
        <p className="text-sm text-muted-foreground">
          Post relationship questions anonymously. Get advice from the community and AI.
        </p>
      </div>

      {/* New question */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Textarea
            placeholder="What's on your mind? Ask a relationship question..."
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button onClick={createPost} disabled={posting || !newQuestion.trim()} variant="send">
              <Send className="h-4 w-4" /> Post Anonymously
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Posts feed */}
      {posts.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No questions yet. Be the first to ask!</p>
      )}

      {posts.map((post) => (
        <Card key={post.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">
                  {post.anonymous_name} · {new Date(post.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
              </div>
              {post.user_id === user?.id && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => deletePost(post.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => toggleExpand(post.id)}>
                <MessageCircle className="h-3.5 w-3.5" />
                {postReplies(post.id).length > 0 ? `${postReplies(post.id).length} Replies` : "Reply"}
                {expandedPost === post.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => askAI(post)}
                disabled={!!loadingAI[post.id]}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {loadingAI[post.id] ? "Thinking..." : "Ask AI Expert"}
              </Button>
            </div>

            {expandedPost === post.id && (
              <div className="space-y-3 pt-2 border-t border-border">
                {/* Replies list */}
                {postReplies(post.id).map((reply) => (
                  <div key={reply.id} className={`rounded-lg p-3 text-sm ${reply.is_ai ? "bg-primary/5 border border-primary/20" : "bg-muted/50"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1 font-medium">
                          {reply.is_ai ? "🤖 AI Expert" : reply.anonymous_name} · {new Date(reply.created_at).toLocaleDateString()}
                        </p>
                        {reply.is_ai ? (
                          <div className="prose prose-sm max-w-none text-foreground">
                            <ReactMarkdown>{reply.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-foreground whitespace-pre-wrap">{reply.content}</p>
                        )}
                      </div>
                      {reply.user_id === user?.id && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => deleteReply(reply.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Reply input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Write a reply..."
                    value={replyText[post.id] || ""}
                    onChange={(e) => setReplyText((p) => ({ ...p, [post.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && submitReply(post.id)}
                  />
                  <Button
                    size="sm"
                    onClick={() => submitReply(post.id)}
                    disabled={!replyText[post.id]?.trim() || !!replyingTo[post.id]}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AskTheExpert;
