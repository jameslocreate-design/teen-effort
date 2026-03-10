import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Heart, CalendarDays, Sparkles, User, Link2, LogOut, Users, Gift, ListChecks, HelpCircle, MoreHorizontal, Dices, Camera, BarChart3, Trophy, CloudSun, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DatePlanner from "@/components/DatePlanner";
import GiftPlanner from "@/components/GiftPlanner";
import SharedCalendar from "@/components/SharedCalendar";
import ProfileSetup from "@/components/ProfileSetup";
import PartnerLink from "@/components/PartnerLink";
import PartnerView from "@/components/PartnerView";
import BucketList from "@/components/BucketList";
import AskTheExpert from "@/components/AskTheExpert";
import OnboardingTour from "@/components/OnboardingTour";
import DateRoulette from "@/components/DateRoulette";
import PhotoJournal from "@/components/PhotoJournal";
import DateStats from "@/components/DateStats";
import Achievements from "@/components/Achievements";
import SharedWishlists from "@/components/SharedWishlists";
import CompatibilityQuiz from "@/components/CompatibilityQuiz";
import { toast } from "sonner";
import AuthPage from "@/pages/AuthPage";

type Tab = "planner" | "gifts" | "bucket" | "expert" | "calendar" | "partner" | "partner-view" | "profile" | "roulette" | "journal" | "stats" | "achievements" | "wishlists" | "quiz";

const primaryTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "planner", label: "Dates", icon: <Sparkles className="h-5 w-5" /> },
  { id: "roulette", label: "Roulette", icon: <Dices className="h-5 w-5" /> },
  { id: "gifts", label: "Gifts", icon: <Gift className="h-5 w-5" /> },
  { id: "calendar", label: "Calendar", icon: <CalendarDays className="h-5 w-5" /> },
];

const secondaryTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "stats", label: "Stats", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "achievements", label: "Badges", icon: <Trophy className="h-4 w-4" /> },
  { id: "journal", label: "Journal", icon: <Camera className="h-4 w-4" /> },
  { id: "bucket", label: "Bucket List", icon: <ListChecks className="h-4 w-4" /> },
  { id: "expert", label: "Expert", icon: <HelpCircle className="h-4 w-4" /> },
  { id: "partner", label: "Link Partner", icon: <Link2 className="h-4 w-4" /> },
  { id: "partner-view", label: "Partner", icon: <Users className="h-4 w-4" /> },
  { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
];

const allTabs = [...primaryTabs, ...secondaryTabs];

const AppShell = () => {
  const { user, loading, signOut } = useAuth();
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("planner");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        const isComplete = !!data?.name;
        setProfileComplete(isComplete);
        // Show onboarding for first-time users
        if (isComplete && !localStorage.getItem("onboarding-done")) {
          setShowOnboarding(true);
        }
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

  const handleOnboardingComplete = () => {
    localStorage.setItem("onboarding-done", "true");
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showOnboarding && <OnboardingTour onComplete={handleOnboardingComplete} />}

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

      {/* Desktop Tab bar (hidden on mobile) */}
      <nav className="border-b border-border px-4 hidden sm:block">
        <div className="flex gap-1 max-w-3xl mx-auto">
          {allTabs.map((tab) => (
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
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20 sm:pb-0">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {activeTab === "planner" && <DatePlanner />}
          {activeTab === "roulette" && <DateRoulette />}
          {activeTab === "gifts" && <GiftPlanner />}
          {activeTab === "bucket" && <BucketList />}
          {activeTab === "expert" && <AskTheExpert />}
          {activeTab === "journal" && <PhotoJournal />}
          {activeTab === "stats" && <DateStats />}
          {activeTab === "achievements" && <Achievements />}
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

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur-md sm:hidden z-40">
        <div className="flex items-center justify-around px-2 py-1">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all min-w-0 ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium truncate">{tab.label}</span>
            </button>
          ))}

          {/* More menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all ${
                  secondaryTabs.some(t => t.id === activeTab)
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="mb-2">
              {secondaryTabs.map((tab) => (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={activeTab === tab.id ? "text-primary" : ""}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
};

export default AppShell;
