import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Share2, Copy, CheckCircle, Users, Gift } from "lucide-react";

interface Referral {
  id: string;
  referral_code: string;
  status: string;
  created_at: string;
  referred_id: string | null;
}

const ReferralSystem = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string>("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [friendCode, setFriendCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;

    // Get user's referral code from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("user_id", user.id)
      .single();

    if (profile?.referral_code) setReferralCode(profile.referral_code);

    // Get referrals made by this user
    const { data: refs } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (refs) setReferrals(refs as Referral[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCopy = async () => {
    const shareText = `Join me on Date Planner! Use my referral code: ${referralCode}\n\nhttps://heart-of-chat.lovable.app`;
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Date Planner!",
          text: `Use my referral code: ${referralCode}`,
          url: "https://heart-of-chat.lovable.app",
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleClaimCode = async () => {
    if (!user || !friendCode.trim()) {
      toast.error("Enter a referral code");
      return;
    }

    if (friendCode.trim() === referralCode) {
      toast.error("You can't use your own code!");
      return;
    }

    // Find the referral
    const { data: ref } = await supabase
      .from("referrals")
      .select("*")
      .eq("referral_code", friendCode.trim())
      .eq("status", "pending")
      .is("referred_id", null)
      .maybeSingle();

    if (!ref) {
      // Create a new referral entry — lookup referrer by their profile referral_code
      const { data: referrerProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", friendCode.trim())
        .maybeSingle();

      if (!referrerProfile) {
        toast.error("Invalid referral code");
        return;
      }

      if (referrerProfile.user_id === user.id) {
        toast.error("You can't use your own code!");
        return;
      }

      const { error } = await supabase.from("referrals").insert({
        referrer_id: referrerProfile.user_id,
        referred_id: user.id,
        referral_code: friendCode.trim(),
        status: "completed",
        completed_at: new Date().toISOString(),
      } as any);

      if (error) toast.error("Failed to apply code");
      else {
        toast.success("Referral code applied! 🎉");
        setFriendCode("");
      }
    } else {
      // Claim existing pending referral
      const { error } = await supabase
        .from("referrals")
        .update({
          referred_id: user.id,
          status: "completed",
          completed_at: new Date().toISOString(),
        } as any)
        .eq("id", ref.id);

      if (error) toast.error("Failed to claim");
      else {
        toast.success("Referral claimed! 🎉");
        setFriendCode("");
      }
    }
  };

  const completedCount = referrals.filter(r => r.status === "completed").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center animate-pulse">
          <Share2 className="h-5 w-5 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
          <Share2 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Invite Couples</h2>
        <p className="text-sm text-muted-foreground">Share the love — invite friends to Date Planner!</p>
      </div>

      {/* Your code */}
      <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Your Referral Code</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg bg-secondary/50 border border-border px-4 py-3 text-center">
            <span className="text-xl font-bold tracking-widest text-primary">{referralCode}</span>
          </div>
          <Button variant="outline" size="icon" onClick={handleCopy} className="h-12 w-12">
            {copied ? <CheckCircle className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <Button onClick={handleShare} className="w-full gap-2">
          <Share2 className="h-4 w-4" /> Share with Friends
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center space-y-1">
          <Users className="h-5 w-5 text-primary mx-auto" />
          <p className="text-2xl font-bold text-foreground">{completedCount}</p>
          <p className="text-xs text-muted-foreground">Friends Joined</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center space-y-1">
          <Gift className="h-5 w-5 text-primary mx-auto" />
          <p className="text-2xl font-bold text-foreground">{completedCount >= 3 ? "🏆" : `${3 - completedCount} more`}</p>
          <p className="text-xs text-muted-foreground">{completedCount >= 3 ? "Reward Unlocked!" : "Until Reward"}</p>
        </div>
      </div>

      {/* Enter a friend's code */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Have a friend's code?</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Enter code"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
            className="bg-secondary/50 border-border"
          />
          <Button onClick={handleClaimCode}>Apply</Button>
        </div>
      </div>

      {/* Referral history */}
      {referrals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">History</h3>
          {referrals.map(ref => (
            <div key={ref.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                {ref.status === "completed"
                  ? <CheckCircle className="h-4 w-4 text-primary" />
                  : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
                <span className="text-sm text-foreground">
                  {ref.status === "completed" ? "Friend joined!" : "Pending..."}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(ref.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReferralSystem;
