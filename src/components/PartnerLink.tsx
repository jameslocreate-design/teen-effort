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

    // Check for pending incoming links (handle accidental duplicates by taking the latest)
    supabase
      .from("partner_links")
      .select("*")
      .eq("user2_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
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

    // Block if already linked to a DIFFERENT partner
    const { data: existingAccepted } = await supabase
      .from("partner_links")
      .select("id, user1_id, user2_id")
      .eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingAccepted) {
      const otherId =
        existingAccepted.user1_id === user.id ? existingAccepted.user2_id : existingAccepted.user1_id;
      if (otherId === partnerId) {
        toast.info("You're already linked with this partner!");
        setLoading(false);
        onLinked();
        return;
      }
      toast.error("You're already linked with another partner. Unlink first.");
      setLoading(false);
      return;
    }

    // Look for any existing row between these two users (either direction, any status)
    const { data: existingRows } = await supabase
      .from("partner_links")
      .select("id, status, user1_id, user2_id, created_at")
      .or(
        `and(user1_id.eq.${user.id},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    const rows = existingRows || [];

    if (rows.length > 0) {
      // Auto-accept whatever's there — both sides clicked, link them up now
      const keepId = rows[0].id;
      await supabase.from("partner_links").update({ status: "accepted" }).eq("id", keepId);
      const dupes = rows.slice(1).map((r) => r.id);
      if (dupes.length > 0) await supabase.from("partner_links").delete().in("id", dupes);
      toast.success("You're linked! 💕");
      setLoading(false);
      onLinked();
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
    if (!pendingLink || !user) return;
    const { error } = await supabase
      .from("partner_links")
      .update({ status: "accepted" })
      .eq("id", pendingLink.id);

    if (error) {
      toast.error("Failed to accept");
      return;
    }

    // Clean up any other pending/duplicate rows between these two users
    const otherUserId =
      pendingLink.user1_id === user.id ? pendingLink.user2_id : pendingLink.user1_id;
    const { data: dupes } = await supabase
      .from("partner_links")
      .select("id")
      .or(
        `and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`
      )
      .neq("id", pendingLink.id);
    if (dupes && dupes.length > 0) {
      await supabase.from("partner_links").delete().in("id", dupes.map((d) => d.id));
    }

    toast.success("You're linked! 💕");
    onLinked();
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

        {/* Your code */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Your Code
          </label>
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm font-mono text-foreground tracking-wider">
              {myCode}
            </div>
            <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(myCode); toast.success("Code copied!"); }} className="rounded-xl h-11 w-11">
              <Copy className="h-4 w-4" />
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
