import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type State = "loading" | "valid" | "already" | "invalid" | "done" | "error";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<State>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
      headers: { apikey: anonKey },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.valid) setState("valid");
        else if (data?.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    setSubmitting(false);
    if (error) setState("error");
    else if (data?.success) setState("done");
    else if (data?.reason === "already_unsubscribed") setState("already");
    else setState("error");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-5">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Heart className="h-6 w-6 text-primary" />
        </div>

        {state === "loading" && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Checking your link…</p>
          </div>
        )}

        {state === "valid" && (
          <>
            <h1 className="font-display text-2xl font-semibold">Unsubscribe from emails?</h1>
            <p className="text-muted-foreground text-sm">
              You'll stop receiving emails from us. You can still use your account as usual.
            </p>
            <Button onClick={handleUnsubscribe} disabled={submitting} className="w-full">
              {submitting ? "Processing…" : "Confirm unsubscribe"}
            </Button>
          </>
        )}

        {state === "done" && (
          <>
            <CheckCircle2 className="h-8 w-8 text-primary mx-auto" />
            <h1 className="font-display text-2xl font-semibold">You're unsubscribed</h1>
            <p className="text-muted-foreground text-sm">
              We won't send you any more emails. We're sorry to see you go.
            </p>
          </>
        )}

        {state === "already" && (
          <>
            <CheckCircle2 className="h-8 w-8 text-primary mx-auto" />
            <h1 className="font-display text-2xl font-semibold">Already unsubscribed</h1>
            <p className="text-muted-foreground text-sm">
              This email address has already been removed from our list.
            </p>
          </>
        )}

        {(state === "invalid" || state === "error") && (
          <>
            <XCircle className="h-8 w-8 text-destructive mx-auto" />
            <h1 className="font-display text-2xl font-semibold">
              {state === "invalid" ? "Invalid link" : "Something went wrong"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {state === "invalid"
                ? "This unsubscribe link is invalid or has expired."
                : "Please try again in a moment."}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
