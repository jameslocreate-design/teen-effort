import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Heart, CalendarDays, Sparkles, User, Link2, LogOut, Users, Gift,
  ListChecks, HelpCircle, Dices, Camera, BarChart3, Trophy,
  HeartHandshake, Share2, MessageSquare, Menu, X, ChevronRight, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import ReferralSystem from "@/components/ReferralSystem";
import DateReviews from "@/components/DateReviews";
import { toast } from "sonner";
import AuthPage from "@/pages/AuthPage";

type Tab =
  | "planner" | "roulette" | "gifts" | "calendar"
  | "wishlists" | "quiz" | "stats" | "achievements"
  | "journal" | "bucket" | "reviews" | "expert"
  | "referral" | "partner" | "partner-view" | "profile"
  | "date-log";

interface NavSection {
  title: string;
  items: { id: Tab; label: string; icon: React.ReactNode }[];
}

const navSections: NavSection[] = [
  {
    title: "Plan",
    items: [
      { id: "planner", label: "Date Ideas", icon: <Sparkles className="h-4 w-4" /> },
      { id: "roulette", label: "Roulette", icon: <Dices className="h-4 w-4" /> },
      { id: "gifts", label: "Gift Ideas", icon: <Gift className="h-4 w-4" /> },
      { id: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
    ],
  },
  {
    title: "Together",
    items: [
      { id: "wishlists", label: "Wishlists", icon: <Gift className="h-4 w-4" /> },
      { id: "quiz", label: "Compatibility Quiz", icon: <HeartHandshake className="h-4 w-4" /> },
      { id: "bucket", label: "Bucket List", icon: <ListChecks className="h-4 w-4" /> },
      { id: "journal", label: "Photo Journal", icon: <Camera className="h-4 w-4" /> },
    ],
  },
  {
    title: "Discover",
    items: [
      { id: "date-log", label: "Date Log", icon: <Clock className="h-4 w-4" /> },
      { id: "reviews", label: "Date Reviews", icon: <MessageSquare className="h-4 w-4" /> },
      { id: "stats", label: "Date Stats", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "achievements", label: "Badges", icon: <Trophy className="h-4 w-4" /> },
      { id: "expert", label: "Ask an Expert", icon: <HelpCircle className="h-4 w-4" /> },
    ],
  },
  {
    title: "Account",
    items: [
      { id: "partner", label: "Link Partner", icon: <Link2 className="h-4 w-4" /> },
      { id: "partner-view", label: "Partner", icon: <Users className="h-4 w-4" /> },
      { id: "referral", label: "Invite Friends", icon: <Share2 className="h-4 w-4" /> },
      { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
    ],
  },
];

const mobileQuickTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "planner", label: "Dates", icon: <Sparkles className="h-5 w-5" /> },
  { id: "roulette", label: "Roulette", icon: <Dices className="h-5 w-5" /> },
  { id: "calendar", label: "Calendar", icon: <CalendarDays className="h-5 w-5" /> },
  { id: "gifts", label: "Gifts", icon: <Gift className="h-5 w-5" /> },
];

const AppShell = () => {
  const { user, loading, signOut } = useAuth();
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("planner");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  if (!profileComplete) return <ProfileSetup onComplete={() => setProfileComplete(true)} />;

  const handleOnboardingComplete = () => {
    localStorage.setItem("onboarding-done", "true");
    setShowOnboarding(false);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const renderNav = () => (
    <div className="space-y-6 py-4">
      {navSections.map((section) => (
        <div key={section.title} className="space-y-1">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground px-3 mb-2">
            {section.title}
          </h3>
          {section.items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {activeTab === item.id && (
                <ChevronRight className="h-3 w-3 ml-auto text-primary" />
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {showOnboarding && <OnboardingTour onComplete={handleOnboardingComplete} />}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-card/50 flex-shrink-0">
        <div className="px-4 py-5 flex items-center gap-3 border-b border-border">
          <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center glow-sm">
            <Heart className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-base font-bold text-foreground tracking-tight">Date Planner</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {renderNav()}
        </div>
        <div className="border-t border-border p-3">
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border shadow-lg animate-slide-in-right flex flex-col"
            style={{ animationName: "slideInLeft" }}
          >
            <div className="px-4 py-5 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center glow-sm">
                  <Heart className="h-4 w-4 text-primary" />
                </div>
                <h1 className="text-base font-bold text-foreground">Date Planner</h1>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="h-8 w-8 text-muted-foreground">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-2">
              {renderNav()}
            </div>
            <div className="border-t border-border p-3">
              <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-muted-foreground">
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="h-8 w-8 text-muted-foreground">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Heart className="h-3.5 w-3.5 text-primary" />
              </div>
              <h1 className="text-sm font-bold text-foreground">Date Planner</h1>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 text-muted-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
            {activeTab === "planner" && <DatePlanner />}
            {activeTab === "roulette" && <DateRoulette />}
            {activeTab === "gifts" && <GiftPlanner />}
            {activeTab === "bucket" && <BucketList />}
            {activeTab === "expert" && <AskTheExpert />}
            {activeTab === "journal" && <PhotoJournal />}
            {activeTab === "stats" && <DateStats />}
            {activeTab === "achievements" && <Achievements />}
            {activeTab === "wishlists" && <SharedWishlists />}
            {activeTab === "quiz" && <CompatibilityQuiz />}
            {activeTab === "reviews" && <DateReviews />}
            {activeTab === "referral" && <ReferralSystem />}
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
        <nav className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur-md lg:hidden z-40">
          <div className="flex items-center justify-around px-2 py-1">
            {mobileQuickTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all min-w-0 ${
                  activeTab === tab.id ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.icon}
                <span className="text-[10px] font-medium truncate">{tab.label}</span>
              </button>
            ))}
            <button
              onClick={() => setSidebarOpen(true)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all ${
                !mobileQuickTabs.some(t => t.id === activeTab) ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default AppShell;
