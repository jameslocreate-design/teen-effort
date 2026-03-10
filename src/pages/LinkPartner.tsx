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

      // Check if already linked
      const { data: existingLink } = await supabase
        .from("partner_links")
        .select("id, status")
        .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
        .eq("status", "accepted")
        .maybeSingle();

      if (existingLink) {
        toast.info("You're already linked with a partner!");
        navigate("/", { replace: true });
        return;
      }

      // Check for existing pending link between these two users
      const { data: pendingLink } = await supabase
        .from("partner_links")
        .select("id, status, user1_id, user2_id")
        .or(
          `and(user1_id.eq.${user!.id},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${user!.id})`
        )
        .maybeSingle();

      if (pendingLink) {
        if (pendingLink.status === "accepted") {
          toast.info("You're already linked with this partner!");
          navigate("/", { replace: true });
          return;
        }
        // Accept the pending link
        await supabase
          .from("partner_links")
          .update({ status: "accepted" })
          .eq("id", pendingLink.id);
        setStatus("success");
        return;
      }

      // Create and immediately accept the link
      const { error } = await supabase.from("partner_links").insert({
        user1_id: partnerId,
        user2_id: user!.id,
        status: "accepted",
      });

      if (error) {
        console.error("Link error:", error);
        setStatus("error");
        return;
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
