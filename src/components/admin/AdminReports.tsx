import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag } from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: string; reporter_id: string; reported_user_id: string | null; content_type: string;
  content_id: string | null; content_snapshot: string | null; reason: string;
  details: string | null; status: string; created_at: string;
}

/** Admin queue of user reports (Apple 1.2: act on reports within 24h). */
const AdminReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const load = async () => {
    const { data, error } = await supabase.from("content_reports").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to load reports");
    setReports((data as Report[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("content_reports").update({ status }).eq("id", id);
    if (error) return toast.error("Update failed");
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const shown = reports.filter((r) => filter === "all" || r.status !== "resolved" && r.status !== "dismissed");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Flag className="h-5 w-5" /> User Reports ({shown.length})
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setFilter(filter === "open" ? "all" : "open")}>
          {filter === "open" ? "Show all" : "Open only"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {shown.length === 0 && <p className="text-sm text-muted-foreground">No reports.</p>}
        {shown.map((r) => (
          <div key={r.id} className="rounded-lg border border-border p-3 space-y-1">
            <div className="flex justify-between gap-2 text-xs text-muted-foreground">
              <span>{r.content_type.replace(/_/g, " ")} · {r.status}</span>
              <span>{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <p className="text-sm font-medium text-foreground">{r.reason}</p>
            {r.details && <p className="text-sm text-muted-foreground">{r.details}</p>}
            {r.content_snapshot && <p className="text-sm italic text-foreground/80 line-clamp-4">"{r.content_snapshot}"</p>}
            <p className="text-xs text-muted-foreground break-all">Reported user: {r.reported_user_id ?? "—"}</p>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "resolved")}>Mark resolved</Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "dismissed")}>Dismiss</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AdminReports;
