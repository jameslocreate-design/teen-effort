import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link2, Copy, Check, UserPlus, Heart, Share2 } from "lucide-react";

interface PartnerLinkProps {
  onLinked: () => void;
}

const PartnerLink = ({ onLinked }: PartnerLinkProps) => {
  const { user } = useAuth();
  const [myCode, setMyCode] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingLink, setPendingLink] = useState<any>(null);

  const shareUrl = myCode ? `${window.location.origin}/link/${myCode}` : "";

  useEffect(() => {
    if (!user) return;

    // Get my partner code
    supabase
      .from("profiles")
      .select("partner_code")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.partner_code) setMyCode(data.partner_code);
      });

    // Check for pending incoming links
    supabase
      .from("partner_links")
      .select("*")
      .eq("user2_id", user.id)
      .eq("status", "pending")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPendingLink(data);
      });

    // Process any pending partner code from link click before login
    const pendingCode = localStorage.getItem("pending-partner-code");
    if (pendingCode) {
      localStorage.removeItem("pending-partner-code");
      setPartnerCode(pendingCode);
      // Auto-trigger linking
      handleLinkWithCode(pendingCode);
    }
  }, [user]);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Link with me on Date Planner 💕",
          text: "Click this link to connect as my partner on Date Planner!",
          url: shareUrl,
        });
      } catch {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  const handleLinkWithCode = async (code: string) => {
    if (!user || !code.trim()) return;
    setLoading(true);

    const { data: partnerId } = await supabase.rpc("lookup_user_by_partner_code", {
      _code: code.trim(),
    });

    if (!partnerId) {
      toast.error("No user found with that code");
      setLoading(false);
      return;
    }

    if (partnerId === user.id) {
      toast.error("That's your own code!");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("partner_links").insert({
      user1_id: user.id,
      user2_id: partnerId,
      status: "pending",
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("A link already exists with this partner");
      } else {
        toast.error("Failed to send link request");
      }
    } else {
      toast.success("Link request sent! Waiting for partner to accept.");
    }
    setLoading(false);
  };

  const handleLink = () => handleLinkWithCode(partnerCode);

  const handleAccept = async () => {
    if (!pendingLink) return;
    const { error } = await supabase
      .from("partner_links")
      .update({ status: "accepted" })
      .eq("id", pendingLink.id);

    if (error) {
      toast.error("Failed to accept");
    } else {
      toast.success("You're linked! 💕");
      onLinked();
    }
  };

  return (
    <div className="flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
            <Link2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Link Your Partner</h1>
          <p className="text-sm text-muted-foreground">
            Share your link — they click it and you're connected!
          </p>
        </div>

        {/* Shareable link */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Your Invite Link
          </label>
          <div className="rounded-xl border border-border bg-secondary/50 px-4 py-3 text-xs font-mono text-muted-foreground break-all">
            {shareUrl}
          </div>
          <div className="flex gap-2">
            <Button onClick={copyLink} variant="outline" className="flex-1 rounded-xl h-11 gap-2">
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button onClick={shareLink} className="flex-1 rounded-xl h-11 gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>

        {/* Pending incoming */}
        {pendingLink && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Someone wants to link with you!
              </span>
            </div>
            <Button onClick={handleAccept} className="w-full rounded-xl">
              Accept Partner Link
            </Button>
          </div>
        )}

        {/* Manual code entry */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Or enter a code manually
          </label>
          <Input
            value={partnerCode}
            onChange={(e) => setPartnerCode(e.target.value)}
            placeholder="Enter their code"
            className="bg-secondary/50 border-border font-mono tracking-wider"
          />
          <Button
            onClick={handleLink}
            disabled={loading || !partnerCode.trim()}
            className="w-full rounded-xl h-11"
          >
            <UserPlus className="h-4 w-4" />
            {loading ? "Sending..." : "Send Link Request"}
          </Button>
        </div>

        <Button variant="ghost" onClick={onLinked} className="w-full text-muted-foreground">
          Skip for now
        </Button>
      </div>
    </div>
  );
};

export default PartnerLink;
