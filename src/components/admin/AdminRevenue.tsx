import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Hourglass, AlertTriangle, XCircle } from "lucide-react";

interface SubStats {
  mrr: number;
  active_subscribers: number;
  trialing: number;
  past_due: number;
  canceling: number;
  by_tier: Record<string, number>;
  by_provider?: Record<string, number>;
  by_cycle?: Record<string, number>;
}

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Web (Stripe)",
  app_store: "Apple App Store",
  play_store: "Google Play",
};

const AdminRevenue = () => {
  const [stats, setStats] = useState<SubStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("get_subscription_stats").then(({ data, error }) => {
      if (!error && data) setStats(data as unknown as SubStats);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading revenue…</p>;
  }

  if (!stats) {
    return <p className="text-muted-foreground text-sm">No subscription data available.</p>;
  }

  const arr = (stats.mrr * 12).toFixed(2);
  const churnRate =
    stats.active_subscribers > 0
      ? Math.round((stats.canceling / stats.active_subscribers) * 100)
      : 0;

  const cards = [
    { label: "MRR", value: `$${stats.mrr.toFixed(2)}`, icon: DollarSign, color: "text-green-500" },
    { label: "Est. ARR", value: `$${arr}`, icon: DollarSign, color: "text-emerald-500" },
    { label: "Active Subscribers", value: stats.active_subscribers, icon: Users, color: "text-blue-500" },
    { label: "On Trial", value: stats.trialing, icon: Hourglass, color: "text-amber-500" },
    { label: "Past Due", value: stats.past_due, icon: AlertTriangle, color: "text-orange-500" },
    { label: "Canceling", value: `${stats.canceling} (${churnRate}%)`, icon: XCircle, color: "text-red-500" },
  ];

  const tierEntries = Object.entries(stats.by_tier ?? {});

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Revenue & Subscriptions</h2>
        <p className="text-muted-foreground text-sm">Live billing metrics across all plans</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <c.icon className={`h-5 w-5 mb-2 ${c.color}`} />
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subscribers by Tier</CardTitle>
        </CardHeader>
        <CardContent>
          {tierEntries.length > 0 ? (
            <div className="space-y-3">
              {tierEntries.map(([tier, count]) => {
                const pct =
                  stats.active_subscribers > 0
                    ? Math.round((count / stats.active_subscribers) * 100)
                    : 0;
                return (
                  <div key={tier}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-foreground font-medium">{tier}</span>
                      <span className="text-muted-foreground">
                        {count} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No active subscribers yet.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscribers by Store</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.by_provider ?? {}).length > 0 ? (
              Object.entries(stats.by_provider ?? {}).map(([p, count]) => (
                <div key={p} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{PROVIDER_LABELS[p] ?? p}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No active subscribers yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Billing Cycle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.by_cycle ?? {}).length > 0 ? (
              Object.entries(stats.by_cycle ?? {}).map(([c, count]) => (
                <div key={c} className="flex items-center justify-between text-sm">
                  <span className="text-foreground capitalize">{c}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No active subscribers yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminRevenue;
