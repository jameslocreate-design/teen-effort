import { Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import type { ReactNode } from "react";

interface PremiumGateProps {
  children: ReactNode;
  feature?: string;
  description?: string;
}

const PremiumGate = ({ children, feature = "This feature", description }: PremiumGateProps) => {
  const { user } = useAuth();
  const { isActive, loading } = useSubscription(user?.id);
  const navigate = useNavigate();

  if (loading) return null;
  if (isActive) return <>{children}</>;

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-8 text-center space-y-5">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-display italic text-foreground">{feature} is a Premium feature</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto font-sans">
          {description ?? "Upgrade to unlock unlimited access to all premium features for you and your partner."}
        </p>
      </div>
      <Button onClick={() => navigate("/pricing")} className="rounded-xl gap-2">
        <Sparkles className="h-4 w-4" />
        Upgrade to Premium
      </Button>
    </div>
  );
};

export default PremiumGate;
