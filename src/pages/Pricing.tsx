import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Heart, ArrowLeft, Crown } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useSubscription } from "@/hooks/useSubscription";
import { TIERS } from "@/lib/tiers";
import { toast } from "sonner";

export default function Pricing() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const { isActive, tier, subscription, loading } = useSubscription(user?.id);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.unsubscribe();
  }, []);

  const handleManageBilling = async () => {
    const { data, error } = await supabase.functions.invoke("create-portal-session", {
      body: {
        returnUrl: `${window.location.origin}/pricing`,
        environment: (await import("@/lib/stripe")).getStripeEnvironment(),
      },
    });
    if (error || !data?.url) {
      toast.error("Couldn't open billing portal");
      return;
    }
    window.open(data.url, "_blank");
  };

  if (checkoutPriceId) {
    return (
      <div className="min-h-screen bg-background">
        <PaymentTestModeBanner />
        <div className="max-w-3xl mx-auto p-4">
          <Button variant="ghost" onClick={() => setCheckoutPriceId(null)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to plans
          </Button>
          <StripeEmbeddedCheckout
            priceId={checkoutPriceId}
            customerEmail={user?.email}
            userId={user?.id}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="max-w-6xl mx-auto px-4 py-12 pb-24">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
            <Sparkles className="h-4 w-4" /> Choose your plan
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Pick the plan that fits your love story
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every plan builds on the last. Upgrade anytime — the Soulmate tier unlocks absolutely everything.
          </p>
        </div>

        {isActive && (
          <Card className="p-6 mb-8 border-primary/30 bg-primary/5 text-center">
            <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
            <h2 className="font-display text-2xl font-semibold mb-1">
              You're on the {TIERS.find((t) => t.level === tier)?.name ?? "Premium"} plan
            </h2>
            <p className="text-muted-foreground mb-4">
              Status: {subscription?.status}
              {subscription?.cancel_at_period_end && " (cancels at period end)"}
            </p>
            <Button onClick={handleManageBilling}>Manage Billing</Button>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {TIERS.map((t) => {
            const isCurrent = isActive && tier === t.level;
            const isDowngrade = isActive && tier > t.level;
            return (
              <Card
                key={t.id}
                className={`p-8 relative flex flex-col ${
                  t.highlight ? "border-primary shadow-lg md:scale-105" : ""
                }`}
              >
                {t.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold whitespace-nowrap">
                    MOST POPULAR
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  {t.level === 3 && <Crown className="h-5 w-5 text-primary" />}
                  <h3 className="font-display text-2xl font-semibold">{t.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{t.tagline}</p>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-bold">{t.price}</span>
                  <span className="text-muted-foreground">/ month</span>
                </div>
                <Button
                  className="w-full mb-6"
                  variant={t.highlight ? "default" : "outline"}
                  disabled={isCurrent || isDowngrade || !user || loading}
                  onClick={() => setCheckoutPriceId(t.priceId)}
                >
                  {isCurrent
                    ? "Current plan"
                    : isDowngrade
                    ? "Included in your plan"
                    : !user
                    ? "Sign in to subscribe"
                    : isActive
                    ? `Upgrade to ${t.name}`
                    : `Choose ${t.name}`}
                </Button>
                <ul className="space-y-3">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Cancel anytime. Taxes calculated at checkout.
        </p>
      </div>
    </div>
  );
}
