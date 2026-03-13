import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthPage from "@/pages/AuthPage";
import DateLog from "@/components/DateLog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DateLogInner = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (!user) return <AuthPage />;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md px-4 py-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
      <DateLog />
    </div>
  );
};

const DateLogPage = () => (
  <AuthProvider>
    <DateLogInner />
  </AuthProvider>
);

export default DateLogPage;
