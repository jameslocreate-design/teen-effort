import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield, LogOut, Users, Heart, CalendarDays, Gift, ListChecks, HelpCircle,
  BarChart3, Megaphone, MessageSquare, TrendingUp, Activity, Star, Camera, Download, Bookmark,
  Share2, ClipboardList, MessageCircle, ScrollText
} from "lucide-react";
import AdminUserManagement from "@/components/admin/AdminUserManagement";
import AdminContentModeration from "@/components/admin/AdminContentModeration";
import AdminMarketing from "@/components/admin/AdminMarketing";
import AdminDataExport from "@/components/admin/AdminDataExport";

type AdminView = "dashboard" | "users" | "content" | "marketing" | "export";

interface AdminStats {
  total_users: number;
  total_partner_links: number;
  total_calendar_entries: number;
  total_bucket_items: number;
  total_saved_gifts: number;
  total_expert_posts: number;
  total_expert_replies: number;
  total_favorites: number;
  total_rated_dates: number;
  avg_date_rating: number;
  total_photos: number;
  total_special_events: number;
  total_wishlists: number;
  total_referrals: number;
  completed_referrals: number;
  total_date_reviews: number;
  total_quiz_answers: number;
  users_this_week: number;
  users_this_month: number;
  recent_signups: { name: string; created_at: string; zipcode: string | null; gender: string | null }[] | null;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<AdminView>("dashboard");
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndLoadStats();
  }, []);

  const checkAdminAndLoadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/admin"); return; }

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) { navigate("/admin"); return; }

    const { data, error } = await supabase.rpc("get_admin_stats");
    if (!error && data) setStats(data as unknown as AdminStats);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center animate-pulse">
          <Shield className="h-5 w-5 text-primary" />
        </div>
      </div>
    );
  }

  const statCards = stats ? [
    { label: "Total Users", value: stats.total_users, icon: Users, color: "text-blue-500" },
    { label: "Partner Links", value: stats.total_partner_links, icon: Heart, color: "text-pink-500" },
    { label: "Calendar Entries", value: stats.total_calendar_entries, icon: CalendarDays, color: "text-green-500" },
    { label: "Bucket List Items", value: stats.total_bucket_items, icon: ListChecks, color: "text-purple-500" },
    { label: "Saved Gifts", value: stats.total_saved_gifts, icon: Gift, color: "text-orange-500" },
    { label: "Expert Posts", value: stats.total_expert_posts, icon: HelpCircle, color: "text-cyan-500" },
    { label: "Favorited Dates", value: stats.total_favorites, icon: Bookmark, color: "text-red-500" },
    { label: "Rated Dates", value: stats.total_rated_dates, icon: Star, color: "text-yellow-500" },
    { label: "Avg Rating", value: stats.avg_date_rating, icon: Star, color: "text-amber-500" },
    { label: "Photos Uploaded", value: stats.total_photos, icon: Camera, color: "text-indigo-500" },
    { label: "Special Events", value: stats.total_special_events, icon: CalendarDays, color: "text-rose-500" },
    { label: "New This Week", value: stats.users_this_week, icon: TrendingUp, color: "text-emerald-500" },
    { label: "New This Month", value: stats.users_this_month, icon: Activity, color: "text-amber-500" },
  ] : [];

  const navItems: { id: AdminView; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard & Analytics", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "users", label: "User Management", icon: <Users className="h-4 w-4" /> },
    { id: "content", label: "Content Moderation", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "marketing", label: "Marketing", icon: <Megaphone className="h-4 w-4" /> },
    { id: "export", label: "Data Export", icon: <Download className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Admin Panel</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground">
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      {/* Navigation */}
      <nav className="border-b border-border px-4">
        <div className="flex gap-1 max-w-5xl mx-auto overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeView === item.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {activeView === "dashboard" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">Dashboard & Analytics</h2>
                <p className="text-muted-foreground text-sm">Overview of your application metrics</p>
              </div>

              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Recent Signups */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Signups</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.recent_signups && stats.recent_signups.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Name</th>
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Gender</th>
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Zipcode</th>
                            <th className="text-left py-2 font-medium text-muted-foreground">Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recent_signups.map((user, i) => (
                            <tr key={i} className="border-b border-border last:border-0">
                              <td className="py-2 pr-4 text-foreground">{user.name || "—"}</td>
                              <td className="py-2 pr-4 text-foreground capitalize">{user.gender || "—"}</td>
                              <td className="py-2 pr-4 text-foreground">{user.zipcode || "—"}</td>
                              <td className="py-2 text-muted-foreground">
                                {new Date(user.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No signups yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === "users" && <AdminUserManagement />}
          {activeView === "content" && <AdminContentModeration />}
          {activeView === "marketing" && <AdminMarketing />}
          {activeView === "export" && <AdminDataExport />}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
