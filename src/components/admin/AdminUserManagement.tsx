import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  gender: string | null;
  zipcode: string | null;
  birthday: string | null;
  created_at: string;
  partner_code: string | null;
}

const AdminUserManagement = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    // Admin can see all profiles via service-level access through the get_admin_users function
    // For now we query profiles - admin RLS will need a policy for this
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (!error && data) setProfiles(data);
    setLoading(false);
  };

  const filtered = profiles.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.zipcode && p.zipcode.includes(search))
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">User Management</h2>
        <p className="text-muted-foreground text-sm">View and search all registered users</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or zipcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Gender</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Birthday</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Zipcode</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Partner Code</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 text-foreground font-medium">{user.name || "—"}</td>
                      <td className="py-2 pr-4 text-foreground capitalize">{user.gender || "—"}</td>
                      <td className="py-2 pr-4 text-foreground">{user.birthday || "—"}</td>
                      <td className="py-2 pr-4 text-foreground">{user.zipcode || "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground font-mono text-xs">{user.partner_code || "—"}</td>
                      <td className="py-2 text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUserManagement;
