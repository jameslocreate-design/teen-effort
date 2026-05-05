import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

const LinkPartner = () => {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "self">("loading");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Store the link code so we can process after login
      if (code) localStorage.setItem("pending-partner-code", code);
      navigate("/", { replace: true });
      toast.info("Please sign in first, then the partner link will be applied automatically.");
      return;
    }

    if (!code) {
      setStatus("error");
      return;
    }

    linkPartner(code);
  }, [user, authLoading, code]);

  const linkPartner = async (partnerCode: string) => {
    try {
      // Look up partner by code
      const { data: partnerId } = await supabase.rpc("lookup_user_by_partner_code", {
        _code: partnerCode,
      });

      if (!partnerId) {
        setStatus("error");
        return;
      }

      if (partnerId === user!.id) {
        setStatus("self");
        return;
      }

      // Find ALL existing rows between these two users (either direction, any status).
      // Duplicates may exist from earlier buggy flows — handle them all.
      const { data: existingRows } = await supabase
        .from("partner_links")
        .select("id, status, user1_id, user2_id, created_at")
        .or(
          `and(user1_id.eq.${user!.id},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${user!.id})`
        )
        .order("created_at", { ascending: true });

      // Also check if THIS user is already accepted-linked to anyone else
      const { data: otherAccepted } = await supabase
        .from("partner_links")
        .select("id, user1_id, user2_id")
        .eq("status", "accepted")
        .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otherAccepted) {
        const otherPartnerId =
          otherAccepted.user1_id === user!.id ? otherAccepted.user2_id : otherAccepted.user1_id;
        if (otherPartnerId !== partnerId) {
          toast.info("You're already linked with a different partner. Unlink first to change.");
          navigate("/", { replace: true });
          return;
        }
      }

      const rows = existingRows || [];
      const acceptedRow = rows.find((r) => r.status === "accepted");
      let linkId: string | null = acceptedRow?.id ?? null;

      if (acceptedRow) {
        // Already linked — just dedupe and continue
      } else if (rows.length > 0) {
        // Promote the oldest row to accepted
        linkId = rows[0].id;
        const { error: upErr } = await supabase
          .from("partner_links")
          .update({ status: "accepted" })
          .eq("id", linkId);
        if (upErr) {
          console.error("Accept update error:", upErr);
          setStatus("error");
          return;
        }
      } else {
        // Create a brand-new accepted link
        const { data: inserted, error } = await supabase
          .from("partner_links")
          .insert({
            user1_id: partnerId,
            user2_id: user!.id,
            status: "accepted",
          })
          .select("id")
          .single();
        if (error || !inserted) {
          console.error("Link insert error:", error);
          setStatus("error");
          return;
        }
        linkId = inserted.id;
      }

      // Remove any duplicate rows between these two users so future reads return exactly one
      const duplicateIds = rows.map((r) => r.id).filter((id) => id !== linkId);
      if (duplicateIds.length > 0) {
        await supabase.from("partner_links").delete().in("id", duplicateIds);
      }

      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const handleContinue = () => navigate("/", { replace: true });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
            <p className="text-muted-foreground">Linking your accounts...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">You're linked! 💕</h1>
            <p className="text-muted-foreground">Your accounts are now connected. Start planning dates together!</p>
            <button
              onClick={handleContinue}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium hover:bg-primary/90 transition-colors"
            >
              Get Started
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-2xl font-bold text-foreground">Invalid Link</h1>
            <p className="text-muted-foreground">This partner link is invalid or expired.</p>
            <button
              onClick={handleContinue}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium hover:bg-primary/90 transition-colors"
            >
              Go to App
            </button>
          </>
        )}

        {status === "self" && (
          <>
            <h1 className="text-2xl font-bold text-foreground">That's your own link! 😄</h1>
            <p className="text-muted-foreground">Share this link with your partner instead.</p>
            <button
              onClick={handleContinue}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium hover:bg-primary/90 transition-colors"
            >
              Go to App
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LinkPartner;
