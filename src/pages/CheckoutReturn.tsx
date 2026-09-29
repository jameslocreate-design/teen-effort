import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, CheckCircle2 } from "lucide-react";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold mb-2">Welcome to Premium</h1>
        <p className="text-muted-foreground mb-6 flex items-center justify-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          Thank you for supporting us
        </p>
        {sessionId && (
          <p className="text-xs text-muted-foreground mb-6 break-all">
            Session: {sessionId.slice(0, 24)}...
          </p>
        )}
        <div className="flex gap-3">
          <Button onClick={() => navigate("/")} className="flex-1">Go to App</Button>
          <Button onClick={() => navigate("/pricing")} variant="outline" className="flex-1">
            View Plan
          </Button>
        </div>
      </Card>
    </div>
  );
}
