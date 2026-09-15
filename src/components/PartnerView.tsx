import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { User, Unlink, CalendarDays, Heart, BookHeart, Download, Check, Clock, Flag, Ban } from "lucide-react";
import { format } from "date-fns";
import { generateMemoryBook } from "@/lib/memory-book";
import ReportDialog from "@/components/ReportDialog";
import { blockUser } from "@/lib/moderation";

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
  const [myName, setMyName] = useState("Me");
  const [isUser1, setIsUser1] = useState(true);
  const [myConsent, setMyConsent] = useState(false);
  const [partnerConsent, setPartnerConsent] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const bothAgreed = myConsent && partnerConsent;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get accepted partner link (use limit(1) so accidental duplicates don't break the read)
    const { data: link } = await supabase
      .from("partner_links")
      .select("id, created_at, user1_id, user2_id, user1_memories_ok, user2_memories_ok")
      .eq("status", "accepted")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!link) {
      setLoading(false);
      return;
    }

    setLinkId(link.id);
    setLinkedDate(link.created_at);

    const mine = link.user1_id === user.id;
    setIsUser1(mine);
    setMyConsent(mine ? link.user1_memories_ok : link.user2_memories_ok);
    setPartnerConsent(mine ? link.user2_memories_ok : link.user1_memories_ok);

    const partnerId = mine ? link.user2_id : link.user1_id;
    setPartnerId(partnerId);

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, birthday, gender, avatar_url")
      .eq("user_id", partnerId)
      .single();

    if (profile) {
      setPartner({
        ...profile,
        avatar_url: await signedUrl("avatars", (profile as any).avatar_url),
      });
    }

    const { data: me } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (me?.name) setMyName(me.name);

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Pick up the partner's answer when returning to the screen
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === "visible") fetchData(); };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [fetchData]);

  const toggleConsent = async (value: boolean) => {
    if (!linkId) return;
    setSavingConsent(true);
    const column = isUser1 ? "user1_memories_ok" : "user2_memories_ok";
    const { error } = await supabase
      .from("partner_links")
      .update({ [column]: value })
      .eq("id", linkId);
    if (error) {
      toast.error("Couldn't save that. Try again.");
    } else {
      setMyConsent(value);
      toast.success(value ? "You've agreed to share your memories" : "Memory sharing turned off");
      fetchData();
    }
    setSavingConsent(false);
  };

  const downloadMemoryBook = async () => {
    if (!linkId || !partner) return false;
    setDownloading(true);
    try {
      await generateMemoryBook({
        partnerLinkId: linkId,
        myName,
        partnerName: partner.name,
        linkedSince: linkedDate,
      });
      toast.success("Your memory book is downloading");
      return true;
    } catch {
      toast.error("Couldn't create the memory book");
      return false;
    } finally {
      setDownloading(false);
    }
  };

  const handleUnlink = async () => {
    if (!linkId) return;
    const message = bothAgreed
      ? "You both agreed to keep your memories. Your memory book will download first, then you'll be unlinked and the shared dates removed. Continue?"
      : "Are you sure you want to unlink from your partner? This will remove your shared calendar data.";
    if (!window.confirm(message)) return;

    setUnlinking(true);

    if (bothAgreed) {
      const ok = await downloadMemoryBook();
      if (!ok) {
        setUnlinking(false);
        return;
      }
    }

    const { error } = await supabase.from("partner_links").delete().eq("id", linkId);
    if (error) {
      toast.error("Failed to unlink");
    } else {
      toast.success("Account unlinked");
      onUnlinked();
    }
    setUnlinking(false);
  };

  const handleBlock = async () => {
    if (!partnerId) return;
    if (
      !window.confirm(
        "Blocking will unlink you right away, remove your shared dates and stop this person from ever connecting with you again. Continue?"
      )
    )
      return;
    setBlocking(true);
    try {
      await blockUser(partnerId);
      toast.success("Blocked. You're no longer linked.");
      onUnlinked();
    } catch {
      toast.error("Couldn't block this person. Please try again.");
    } finally {
      setBlocking(false);
    }
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
            <div className="mx-auto h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-3 overflow-hidden ring-2 ring-primary/20">
              {partner.avatar_url ? (
                <img src={partner.avatar_url} alt={partner.name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <h2 className="text-xl font-bold text-foreground">{partner.name}</h2>
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
              {partner.birthday && (() => {
                const [y, m, d] = partner.birthday.split('-').map(Number);
                return <span>{format(new Date(y, m - 1, d), "MMM d, yyyy")}</span>;
              })()}
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

        {/* Keep our memories agreement */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <BookHeart className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Keep our memories</h3>
              <p className="text-xs text-muted-foreground">
                If you both agree, you can each download a memory book of your dates, ratings and
                photos before unlinking.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/50 px-4 py-3">
            <span className="text-sm text-foreground">I agree to share our memories</span>
            <Switch
              checked={myConsent}
              disabled={savingConsent}
              onCheckedChange={toggleConsent}
              aria-label="Agree to share our memories"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            {partnerConsent ? (
              <>
                <Check className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">
                  {partner.name} has agreed too
                </span>
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Waiting for {partner.name} to agree
                </span>
              </>
            )}
          </div>

          {bothAgreed && (
            <Button
              onClick={downloadMemoryBook}
              disabled={downloading}
              className="w-full rounded-xl h-11 gap-2"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Creating your book..." : "Download memory book"}
            </Button>
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

        {/* Safety */}
        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground text-center">
            Feeling unsafe or uncomfortable? You can report or block this person.
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setReportOpen(true)}
              className="flex-1 rounded-xl h-11 text-muted-foreground"
            >
              <Flag className="h-4 w-4" /> Report
            </Button>
            <Button
              variant="ghost"
              onClick={handleBlock}
              disabled={blocking}
              className="flex-1 rounded-xl h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Ban className="h-4 w-4" /> {blocking ? "Blocking..." : "Block"}
            </Button>
          </div>
        </div>

        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          contentType="partner_profile"
          contentId={partnerId}
          reportedUserId={partnerId}
          snapshot={partner.name}
          label="this person"
        />
      </div>
    </div>
  );
};

export default PartnerView;
