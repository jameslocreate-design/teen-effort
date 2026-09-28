import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Ban, Flag, Loader2, ShieldCheck, UserX } from "lucide-react";
import ReportDialog from "@/components/ReportDialog";
import { blockUser, unblockUser } from "@/lib/moderation";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BlockedRow { blocked_id: string; name: string; blocked_at: string }

/** Always-visible Safety hub: report/block your partner, manage blocked accounts. */
const SafetyCenter = ({ userId }: { userId?: string }) => {
  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<{ id: string; name: string } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("list_my_blocked_users" as never);
    setBlocked(((data as BlockedRow[] | null) ?? []));
    if (userId) {
      const { data: link } = await supabase
        .from("partner_links").select("user1_id,user2_id,status")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`).eq("status", "accepted").maybeSingle();
      if (link) {
        const pid = link.user1_id === userId ? link.user2_id : link.user1_id;
        const { data: p } = await supabase.from("profiles").select("name").eq("user_id", pid).maybeSingle();
        setPartner({ id: pid, name: p?.name || "Your partner" });
      } else setPartner(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const doBlock = async () => {
    if (!partner) return;
    setBusy("block");
    try {
      await blockUser(partner.id);
      toast.success("Blocked. You're no longer linked.");
      window.dispatchEvent(new CustomEvent("partner-link-changed"));
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Couldn't block");
    } finally { setBusy(null); setConfirmBlock(false); }
  };

  const doUnblock = async (id: string) => {
    setBusy(id);
    await unblockUser(id);
    toast.success("Unblocked");
    await load();
    setBusy(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Teen Effort has zero tolerance for harassment, explicit content or abuse. Tap the
        <Flag className="inline h-3.5 w-3.5 mx-1" />flag on any letter, review or request to report it.
        Our team reviews every report within 24 hours and removes content or accounts that break our rules.
      </p>

      {loading ? (
        <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {partner && (
            <div className="rounded-xl border border-border p-3 space-y-2">
              <p className="text-sm font-medium text-foreground">{partner.name}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={() => setReportOpen(true)}>
                  <Flag className="h-4 w-4" /> Report
                </Button>
                <Button variant="destructive" className="h-11 rounded-xl gap-2" disabled={busy === "block"} onClick={() => setConfirmBlock(true)}>
                  <Ban className="h-4 w-4" /> Block
                </Button>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <UserX className="h-4 w-4" /> Blocked accounts
            </p>
            {blocked.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> You haven't blocked anyone.
              </p>
            ) : (
              <ul className="space-y-2">
                {blocked.map((b) => (
                  <li key={b.blocked_id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                    <span className="text-sm text-foreground truncate">{b.name}</span>
                    <Button size="sm" variant="ghost" className="h-11" disabled={busy === b.blocked_id} onClick={() => doUnblock(b.blocked_id)}>
                      Unblock
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Urgent safety concern? Email <a className="underline" href="mailto:support.teeneffort@gmail.com">support.teeneffort@gmail.com</a>.
        If someone is in danger, call 911.
      </p>

      {partner && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          contentType="partner_profile"
          contentId={partner.id}
          reportedUserId={partner.id}
          snapshot={partner.name}
          label="this person"
        />
      )}

      <AlertDialog open={confirmBlock} onOpenChange={setConfirmBlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {partner?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll be unlinked immediately, they won't be able to see your content, and they can never send you a link request again unless you unblock them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doBlock}>Block</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SafetyCenter;
