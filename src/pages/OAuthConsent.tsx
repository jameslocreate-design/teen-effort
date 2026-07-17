import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

// Safe same-origin relative path validator
const safeNext = (): string => {
  const full = window.location.pathname + window.location.search;
  return full;
};

// Beta auth.oauth typing shim
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauth = () => (supabase.auth as any).oauth as OAuthApi;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        window.location.href = "/?next=" + encodeURIComponent(safeNext());
        return;
      }
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load authorization request");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        return setError(error.message);
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        return setError("No redirect returned by the authorization server.");
      }
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(e?.message ?? "Authorization failed");
    }
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="card-premium max-w-md w-full p-8 text-center space-y-4">
          <h1 className="text-2xl font-serif">Authorization error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "an app";

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card-premium max-w-md w-full p-8 space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Heart className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-serif">Connect {clientName} to Midnight &amp; Rose</h1>
          <p className="text-sm text-muted-foreground">
            {clientName} will be able to call this app's enabled tools while you are signed in.
          </p>
        </div>

        <div className="rounded-md border border-border p-4 space-y-2 text-sm">
          <div className="font-medium">This lets {clientName} use this app as you.</div>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Share your basic profile</li>
            <li>Read your upcoming dates, saved date ideas, and bucket list</li>
            <li>Add items to your shared bucket list</li>
          </ul>
          <p className="text-xs text-muted-foreground pt-2">
            This does not bypass this app's permissions or backend policies.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Cancel connection
          </Button>
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
            {busy ? "Working…" : "Approve"}
          </Button>
        </div>
      </div>
    </main>
  );
}
