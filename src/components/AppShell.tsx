import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Heart, CalendarDays, Sparkles, User, Link2, LogOut, Users, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import DatePlanner from "@/components/DatePlanner";
import GiftPlanner from "@/components/GiftPlanner";
import SharedCalendar from "@/components/SharedCalendar";
import ProfileSetup from "@/components/ProfileSetup";
import PartnerLink from "@/components/PartnerLink";
import PartnerView from "@/components/PartnerView";
import { toast } from "sonner";
import AuthPage from "@/pages/AuthPage";

type Tab = "planner" | "calendar" | "partner" | "partner-view" | "profile";

const AppShell = () => {
  const { user, loading, signOut } = useAuth();
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("planner");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setProfileComplete(!!data?.name);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center animate-pulse">
          <Heart className="h-5 w-5 text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  if (profileComplete === null) return null;

  if (!profileComplete) {
    return <ProfileSetup onComplete={() => setProfileComplete(true)} />;
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "planner", label: "Plan", icon: <Sparkles className="h-4 w-4" /> },
    { id: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
    { id: "partner", label: "Link", icon: <Link2 className="h-4 w-4" /> },
    { id: "partner-view", label: "Partner", icon: <Users className="h-4 w-4" /> },
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center glow-sm">
            <Heart className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Date Planner</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground">
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      {/* Tab bar */}
      <nav className="border-b border-border px-4">
        <div className="flex gap-1 max-w-3xl mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {activeTab === "planner" && <DatePlanner />}
          {activeTab === "calendar" && (
            <SharedCalendar
              onPlanDate={(title, date) => {
                toast.info(`Plan a date for "${title}" on ${date} — use the filters below!`);
                setActiveTab("planner");
              }}
            />
          )}
          {activeTab === "partner" && <PartnerLink onLinked={() => setActiveTab("partner-view")} />}
          {activeTab === "partner-view" && <PartnerView onUnlinked={() => setActiveTab("partner")} />}
          {activeTab === "profile" && <ProfileSetup onComplete={() => {}} />}
        </div>
      </main>
    </div>
  );
};

export default AppShell;
