import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Heart, ArrowLeft } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

const PREMIUM_FEATURES = [
  "Unlimited AI date ideas",
  "Unlimited AI gift suggestions",
  "Date Roulette spin-the-wheel",
  "Unlimited special event reminders",
  "Advanced shared calendar features",
  "Priority access to Expert Forum AI replies",
  "Save & organize gift ideas privately",
  "Premium badge on your profile",
];

export default function Pricing() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const { isActive, subscription, loading } = useSubscription(user?.id);

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
      <div className="max-w-5xl mx-auto px-4 py-12 pb-24">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
            <Sparkles className="h-4 w-4" /> Premium
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Unlock the full experience
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Take your relationship to the next level with unlimited AI date ideas, gift suggestions, and more.
          </p>
        </div>

        {isActive && (
          <Card className="p-6 mb-8 border-primary/30 bg-primary/5 text-center">
            <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
            <h2 className="font-display text-2xl font-semibold mb-1">You're a Premium member</h2>
            <p className="text-muted-foreground mb-4">
              Status: {subscription?.status}
              {subscription?.cancel_at_period_end && " (cancels at period end)"}
            </p>
            <Button onClick={handleManageBilling}>Manage Billing</Button>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Monthly */}
          <Card className="p-8 relative">
            <h3 className="font-display text-2xl font-semibold mb-2">Monthly</h3>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-4xl font-bold">$9.99</span>
              <span className="text-muted-foreground">/ month</span>
            </div>
            <Button
              className="w-full mb-6"
              disabled={isActive || !user || loading}
              onClick={() => setCheckoutPriceId("premium_monthly")}
            >
              {isActive ? "Already subscribed" : !user ? "Sign in to subscribe" : "Subscribe Monthly"}
            </Button>
            <ul className="space-y-3">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Yearly */}
          <Card className="p-8 relative border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              SAVE 42%
            </div>
            <h3 className="font-display text-2xl font-semibold mb-2">Yearly</h3>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold">$69.99</span>
              <span className="text-muted-foreground">/ year</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">~$5.83/month, billed annually</p>
            <Button
              className="w-full mb-6"
              disabled={isActive || !user || loading}
              onClick={() => setCheckoutPriceId("premium_yearly")}
            >
              {isActive ? "Already subscribed" : !user ? "Sign in to subscribe" : "Subscribe Yearly"}
            </Button>
            <ul className="space-y-3">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Cancel anytime. Taxes calculated at checkout.
        </p>
      </div>
    </div>
  );
}
