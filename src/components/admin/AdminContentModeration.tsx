import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Post {
  id: string;
  content: string;
  anonymous_name: string;
  created_at: string;
  user_id: string;
}

interface Reply {
  id: string;
  content: string;
  anonymous_name: string;
  created_at: string;
  is_ai: boolean;
  post_id: string;
}

const AdminContentModeration = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    const [postsRes, repliesRes] = await Promise.all([
      supabase.from("expert_posts").select("*").order("created_at", { ascending: false }),
      supabase.from("expert_replies").select("*").order("created_at", { ascending: false }),
    ]);
    if (postsRes.data) setPosts(postsRes.data);
    if (repliesRes.data) setReplies(repliesRes.data);
    setLoading(false);
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("expert_posts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete post");
      return;
    }
    toast.success("Post deleted");
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const deleteReply = async (id: string) => {
    const { error } = await supabase.from("expert_replies").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete reply");
      return;
    }
    toast.success("Reply deleted");
    setReplies((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Content Moderation</h2>
        <p className="text-muted-foreground text-sm">Review and moderate expert community posts and replies</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Expert Posts ({posts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No posts yet.</p>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="flex items-start justify-between gap-4 p-3 rounded-md bg-muted/30 border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{post.anonymous_name}</p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(post.created_at).toLocaleString()}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deletePost(post.id)} className="text-destructive shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Expert Replies ({replies.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {replies.length === 0 ? (
            <p className="text-muted-foreground text-sm">No replies yet.</p>
          ) : (
            replies.slice(0, 20).map((reply) => (
              <div key={reply.id} className="flex items-start justify-between gap-4 p-3 rounded-md bg-muted/30 border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{reply.anonymous_name}</p>
                    {reply.is_ai && (
                      <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">AI</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{reply.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(reply.created_at).toLocaleString()}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteReply(reply.id)} className="text-destructive shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminContentModeration;
