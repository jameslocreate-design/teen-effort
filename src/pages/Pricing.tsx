import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Heart, ArrowLeft, Crown, Minus } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useSubscription } from "@/hooks/useSubscription";
import {
  TIERS,
  COMPARISON_FEATURES,
  priceIdFor,
  yearlySavingsMonths,
  type BillingCycle,
} from "@/lib/tiers";
import { toast } from "sonner";
import { purchasesBlocked } from "@/lib/native";
import { useNativePurchases } from "@/hooks/useNativePurchases";
import { isTestStoreKey } from "@/lib/revenuecat";


export default function Pricing() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const { isActive, tier, subscription, isCanceling, periodEnd, loading } = useSubscription(user?.id);
  const iap = useNativePurchases(user?.id);
  // Apple Guideline 3.1.1: no external purchase flow inside the iOS app.
  // When RevenueCat in-app purchases are available we sell through StoreKit instead.
  const noPurchases = purchasesBlocked() && !iap.available;
  const activeTier = Math.max(tier ?? 0, iap.tier);
  const hasPlan = isActive || iap.tier > 0;

  const handleIapPurchase = async (priceId: string) => {
    try {
      await iap.purchase(priceId);
      toast.success("You're all set — welcome to your new plan!");
    } catch (e: any) {
      if (!/cancel/i.test(e?.message ?? "")) {
        toast.error(e?.message ?? "Purchase could not be completed");
      }
    }
  };

  const handleRestore = async () => {
    const restored = await iap.restore().catch(() => 0);
    toast[restored > 0 ? "success" : "info"](
      restored > 0 ? "Purchases restored." : "No previous purchases found.",
    );
  };

  const [diagnostics, setDiagnostics] = useState<string | null>(null);

  const handleDiagnostics = async () => {
    if (diagnostics) return setDiagnostics(null);
    try {
      const { purchaseDiagnostics } = await import("@/lib/revenuecat");
      const info = await purchaseDiagnostics();
      setDiagnostics(JSON.stringify(info, null, 2));
    } catch (e: any) {
      setDiagnostics(String(e?.message ?? e));
    }
  };


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

  if (checkoutPriceId && !noPurchases) {
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
      {!noPurchases && <PaymentTestModeBanner />}
      <div className="max-w-6xl mx-auto px-4 py-12 pb-24">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
            <Sparkles className="h-4 w-4" /> {noPurchases ? "Membership plans" : "Choose your plan"}
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            {noPurchases ? "What each membership includes" : "Pick the plan that fits your love story"}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {noPurchases
              ? "Every plan builds on the last — the Soulmate tier unlocks absolutely everything."
              : "Every plan builds on the last. Upgrade anytime — the Soulmate tier unlocks absolutely everything."}
          </p>
        </div>

        {iap.available && isTestStoreKey() && (
          <div className="mb-8 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-center text-xs text-muted-foreground">
            Sandbox mode — purchases run against the RevenueCat Test Store and no real charge is made.
          </div>
        )}



        {/* Billing cycle toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center rounded-full border border-border bg-card p-1">
            <button
              onClick={() => setCycle("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                cycle === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setCycle("yearly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                cycle === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Yearly
              <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 ${
                cycle === "yearly" ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
              }`}>
                2 months free
              </span>
            </button>
          </div>
        </div>

        {hasPlan && (
          <Card className="p-6 mb-8 border-primary/30 bg-primary/5 text-center">
            <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
            <h2 className="font-display text-2xl font-semibold mb-1">
              You're on the {TIERS.find((t) => t.level === activeTier)?.name ?? "Premium"} plan
            </h2>
            <p className="text-muted-foreground mb-4">
              {iap.tier > 0 && !isActive
                ? "Managed through your Apple ID subscriptions"
                : `Status: ${subscription?.status}`}
              {isCanceling && periodEnd && ` · access until ${new Date(periodEnd).toLocaleDateString()}`}
            </p>
            {!noPurchases && !iap.available && <Button onClick={handleManageBilling}>Manage Billing</Button>}
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {TIERS.map((t) => {
            const isCurrent = hasPlan && activeTier === t.level;
            const isDowngrade = hasPlan && activeTier > t.level;

            const priceId = priceIdFor(t, cycle);
            const iapPrice = iap.available && iap.ready ? iap.storePrice(priceId) : null;
            const iapMissing = iap.available && iap.ready && !iap.hasProduct(priceId);
            const priceDisplay = iapPrice ?? (cycle === "yearly" ? t.priceYearly : t.price);
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
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold">{priceDisplay}</span>
                  <span className="text-muted-foreground">/ {cycle === "yearly" ? "year" : "month"}</span>
                </div>
                <div className="h-5 mb-5">
                  {cycle === "yearly" && (
                    <span className="text-xs text-primary font-medium">
                      Save {yearlySavingsMonths(t)} months vs monthly
                    </span>
                  )}
                  {cycle === "monthly" && t.trialDays && (
                    <span className="text-xs text-primary font-medium">
                      {t.trialDays}-day free trial
                    </span>
                  )}
                </div>
                {noPurchases ? (
                  <div className="w-full mb-6 rounded-xl border border-border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
                    {isCurrent
                      ? "Your current plan"
                      : isDowngrade
                      ? "Included in your plan"
                      : "Included with a Teen Effort membership"}
                  </div>
                ) : (
                  <Button
                    className="w-full mb-6"
                    variant={t.highlight ? "default" : "outline"}
                    disabled={
                      isCurrent || isDowngrade || !user || loading || iap.busy ||
                      (iap.available && !iap.ready) || iapMissing
                    }
                    onClick={() =>
                      iap.available ? handleIapPurchase(priceId) : setCheckoutPriceId(priceId)
                    }
                  >
                    {isCurrent
                      ? "Current plan"
                      : isDowngrade
                      ? "Included in your plan"
                      : !user
                      ? "Sign in to subscribe"
                      : iap.busy
                      ? "Processing…"
                      : iap.available && !iap.ready
                      ? "Loading plans…"
                      : iapMissing
                      ? "Not available yet"
                      : hasPlan
                      ? `Upgrade to ${t.name}`
                      : t.trialDays
                      ? `Start ${t.trialDays}-day free trial`
                      : `Choose ${t.name}`}

                  </Button>

                )}
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

        {/* Comparison table */}
        <div className="mt-16">
          <h2 className="font-display text-2xl font-semibold text-center mb-6">Compare every plan</h2>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/50">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 min-w-[200px]">Feature</th>
                  {TIERS.map((t) => (
                    <th key={t.id} className="text-center font-semibold px-4 py-3 whitespace-nowrap">
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((feat) => (
                  <tr key={feat.label} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 text-foreground">{feat.label}</td>
                    {TIERS.map((t) => (
                      <td key={t.id} className="text-center px-4 py-3">
                        {t.level >= feat.minLevel ? (
                          <Check className="h-4 w-4 text-primary mx-auto" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {iap.available && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <Button variant="ghost" onClick={handleRestore} disabled={iap.busy}>
              Restore purchases
            </Button>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleDiagnostics}>
              Store diagnostics
            </Button>
            {diagnostics && (
              <pre className="max-w-full overflow-x-auto rounded-xl border border-border bg-card/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
                {diagnostics}
              </pre>
            )}
            <p className="text-center text-xs text-muted-foreground max-w-md">
              Payment is charged to your Apple ID at confirmation. Subscriptions renew automatically
              unless turned off at least 24 hours before the end of the period. Manage or cancel in
              your Apple ID settings.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          {noPurchases
            ? "Plans are shown for information only. Cancel anytime."
            : "Cancel anytime. Taxes calculated at checkout."}
        </p>

      </div>
    </div>
  );
}
