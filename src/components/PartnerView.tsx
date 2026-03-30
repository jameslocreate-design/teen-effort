import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User, Unlink, CalendarDays, Heart } from "lucide-react";
import { format } from "date-fns";

interface PartnerProfile {
  name: string;
  birthday: string | null;
  gender: string | null;
  avatar_url: string | null;
}

interface PartnerViewProps {
  onUnlinked: () => void;
}

const PartnerView = ({ onUnlinked }: PartnerViewProps) => {
  const { user } = useAuth();
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [linkedDate, setLinkedDate] = useState<string | null>(null);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get accepted partner link
    const { data: link } = await supabase
      .from("partner_links")
      .select("id, created_at, user1_id, user2_id")
      .eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .maybeSingle();

    if (!link) {
      setLoading(false);
      return;
    }

    setLinkId(link.id);
    setLinkedDate(link.created_at);

    const partnerId = link.user1_id === user.id ? link.user2_id : link.user1_id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, birthday, gender, avatar_url")
      .eq("user_id", partnerId)
      .single();

    if (profile) setPartner(profile);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUnlink = async () => {
    if (!linkId) return;
    const confirmed = window.confirm("Are you sure you want to unlink from your partner? This will remove your shared calendar data.");
    if (!confirmed) return;

    setUnlinking(true);
    const { error } = await supabase.from("partner_links").delete().eq("id", linkId);
    if (error) {
      toast.error("Failed to unlink");
    } else {
      toast.success("Account unlinked");
      onUnlinked();
    }
    setUnlinking(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center animate-pulse">
          <Heart className="h-5 w-5 text-primary" />
        </div>
      </div>
    );
  }

  if (!partner || !linkId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">No Partner Linked</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Go to the Partner tab to link with someone.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
            <Heart className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Your Partner</h1>
        </div>

        {/* Partner info card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="text-center space-y-1">
            <div className="mx-auto h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-3">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{partner.name}</h2>
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
              {partner.birthday && <span>{format(new Date(partner.birthday), "MMM d, yyyy")}</span>}
              {partner.birthday && partner.gender && <span>·</span>}
              {partner.gender && <span>{partner.gender}</span>}
            </div>
          </div>

          {linkedDate && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-secondary/50 py-3 px-4">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Linked since <span className="text-foreground font-medium">{format(new Date(linkedDate), "MMM d, yyyy")}</span>
              </span>
            </div>
          )}
        </div>

        {/* Unlink */}
        <Button
          variant="outline"
          onClick={handleUnlink}
          disabled={unlinking}
          className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Unlink className="h-4 w-4" />
          {unlinking ? "Unlinking..." : "Unlink Account"}
        </Button>
      </div>
    </div>
  );
};

export default PartnerView;
