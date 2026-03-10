import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileDown, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

const EXPORT_TABLES = [
  { name: "profiles", label: "Users / Profiles", icon: "👤" },
  { name: "partner_links", label: "Partner Links", icon: "🔗" },
  { name: "calendar_entries", label: "Calendar Entries", icon: "📅" },
  { name: "bucket_list", label: "Bucket List Items", icon: "✅" },
  { name: "saved_gifts", label: "Saved Gifts", icon: "🎁" },
  { name: "expert_posts", label: "Expert Posts", icon: "💬" },
  { name: "expert_replies", label: "Expert Replies", icon: "💭" },
  { name: "special_events", label: "Special Events", icon: "🎉" },
  { name: "user_roles", label: "User Roles", icon: "🛡️" },
  { name: "wishlists", label: "Wishlists", icon: "📝" },
  { name: "referrals", label: "Referrals", icon: "🔄" },
  { name: "date_reviews", label: "Date Reviews", icon: "⭐" },
  { name: "quiz_answers", label: "Quiz Answers", icon: "📋" },
];

// Friendly column labels
const COLUMN_LABELS: Record<string, Record<string, string>> = {
  profiles: { name: "Name", gender: "Gender", zipcode: "Zip Code", birthday: "Birthday", created_at: "Joined", descriptors: "Interests" },
  partner_links: { status: "Status", created_at: "Created", updated_at: "Last Updated" },
  calendar_entries: { title: "Date Title", date: "Date", description: "Description", vibe: "Vibe", estimated_cost: "Est. Cost", duration: "Duration", user_rating: "Rating", is_favorite: "Favorited", event_time: "Time" },
  bucket_list: { title: "Item", description: "Description", completed: "Completed", completed_at: "Completed At", created_at: "Added" },
  saved_gifts: { title: "Gift", description: "Description", estimated_cost: "Est. Cost", vibe: "Vibe", where_to_buy: "Where to Buy", personalization_tip: "Personalization Tip", created_at: "Saved" },
  expert_posts: { content: "Post Content", anonymous_name: "Author", created_at: "Posted" },
  expert_replies: { content: "Reply", anonymous_name: "Author", is_ai: "AI Response", created_at: "Posted" },
  special_events: { title: "Event", event_type: "Type", event_date: "Date", recurring: "Recurring", created_at: "Added" },
  user_roles: { role: "Role" },
};

// Columns to hide (internal IDs)
const HIDDEN_COLUMNS = ["id", "user_id", "added_by", "partner_link_id", "post_id", "user1_id", "user2_id", "photo_urls", "yelp_url", "yelp_rating", "yelp_review_count", "partner_code"];

function jsonToCsv(data: any[]): string {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = typeof val === "object" ? JSON.stringify(val) : String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    ),
  ];
  return csvRows.join("\n");
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatValue(val: any): string {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val)) return val.length > 0 ? val.join(", ") : "—";
  if (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return new Date(val).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }
  if (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(val + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }
  if (typeof val === "number") return val % 1 !== 0 ? val.toFixed(1) : String(val);
  return String(val);
}

function getVisibleColumns(tableName: string, data: any[]): string[] {
  if (!data || data.length === 0) return [];
  return Object.keys(data[0]).filter(col => !HIDDEN_COLUMNS.includes(col));
}

function getColumnLabel(tableName: string, col: string): string {
  return COLUMN_LABELS[tableName]?.[col] || col.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function buildReportHTML(allData: Record<string, any[]>): string {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Compute summary stats
  const profiles = allData.profiles || [];
  const calendarEntries = allData.calendar_entries || [];
  const partnerLinks = allData.partner_links || [];
  const bucketList = allData.bucket_list || [];
  const savedGifts = allData.saved_gifts || [];
  const expertPosts = allData.expert_posts || [];
  const expertReplies = allData.expert_replies || [];
  const specialEvents = allData.special_events || [];

  const totalUsers = profiles.length;
  const activePartners = partnerLinks.filter((l: any) => l.status === "accepted").length;
  const totalDates = calendarEntries.length;
  const favoritedDates = calendarEntries.filter((e: any) => e.is_favorite).length;
  const ratedDates = calendarEntries.filter((e: any) => e.user_rating != null);
  const avgRating = ratedDates.length > 0 ? (ratedDates.reduce((s: number, e: any) => s + e.user_rating, 0) / ratedDates.length).toFixed(1) : "N/A";
  const photosUploaded = calendarEntries.reduce((s: number, e: any) => s + (e.photo_urls?.length || 0), 0);
  const completedBucket = bucketList.filter((b: any) => b.completed).length;

  // Gender breakdown
  const genderCounts: Record<string, number> = {};
  profiles.forEach((p: any) => { const g = p.gender || "Not specified"; genderCounts[g] = (genderCounts[g] || 0) + 1; });

  // Vibe popularity
  const vibeCounts: Record<string, number> = {};
  calendarEntries.forEach((e: any) => { if (e.vibe) vibeCounts[e.vibe] = (vibeCounts[e.vibe] || 0) + 1; });
  const topVibes = Object.entries(vibeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxVibeCount = topVibes.length > 0 ? topVibes[0][1] : 1;

  // Build table HTML helper
  const buildTable = (tableName: string, data: any[]) => {
    if (!data || data.length === 0) return `<p style="color:#888;font-style:italic;">No data available.</p>`;
    const cols = getVisibleColumns(tableName, data);
    return `
      <table>
        <thead><tr>${cols.map(c => `<th>${getColumnLabel(tableName, c)}</th>`).join("")}</tr></thead>
        <tbody>${data.map(row => `<tr>${cols.map(c => `<td>${formatValue(row[c])}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Heart of Chat — Data Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a2e; line-height: 1.6; background: #fff; }
  .page { max-width: 900px; margin: 0 auto; padding: 40px 32px; }
  
  /* Cover */
  .cover { text-align: center; padding: 60px 20px; border-bottom: 3px solid #e91e63; margin-bottom: 40px; }
  .cover h1 { font-size: 36px; font-weight: 800; color: #e91e63; margin-bottom: 8px; }
  .cover .subtitle { font-size: 16px; color: #666; }
  .cover .date { font-size: 14px; color: #999; margin-top: 16px; }
  
  /* Executive Summary */
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
  .stat-box { background: #fce4ec; border-radius: 12px; padding: 20px; text-align: center; }
  .stat-box .number { font-size: 32px; font-weight: 800; color: #e91e63; }
  .stat-box .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
  
  /* Sections */
  .section { margin-bottom: 40px; page-break-inside: avoid; }
  .section h2 { font-size: 22px; font-weight: 700; color: #1a1a2e; border-bottom: 2px solid #e91e63; padding-bottom: 8px; margin-bottom: 16px; }
  .section h3 { font-size: 16px; font-weight: 600; margin: 16px 0 8px; color: #333; }
  
  /* Insight cards */
  .insights { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .insight { background: #f8f9fa; border-radius: 10px; padding: 16px; border-left: 4px solid #e91e63; }
  .insight .title { font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .insight .value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
  .insight .detail { font-size: 13px; color: #666; margin-top: 2px; }
  
  /* Bar chart */
  .bar-chart { margin: 16px 0; }
  .bar-row { display: flex; align-items: center; margin-bottom: 8px; }
  .bar-label { width: 120px; font-size: 13px; color: #555; text-align: right; padding-right: 12px; }
  .bar-track { flex: 1; height: 24px; background: #f0f0f0; border-radius: 6px; overflow: hidden; }
  .bar-fill { height: 100%; background: linear-gradient(90deg, #e91e63, #f06292); border-radius: 6px; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; }
  .bar-fill span { font-size: 11px; font-weight: 600; color: #fff; }
  
  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px; }
  thead tr { background: #fce4ec; }
  th { text-align: left; padding: 10px 12px; font-weight: 600; color: #333; border-bottom: 2px solid #e91e63; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; color: #444; }
  tr:nth-child(even) { background: #fafafa; }
  tr:hover { background: #fff3f7; }
  
  /* Footer */
  .footer { text-align: center; padding: 30px 0; border-top: 1px solid #eee; color: #999; font-size: 12px; margin-top: 40px; }
  
  /* Print styles */
  @media print {
    body { background: #fff; }
    .page { padding: 20px; }
    .section { page-break-inside: avoid; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Cover -->
  <div class="cover">
    <h1>💕 Heart of Chat</h1>
    <div class="subtitle">Platform Analytics & Data Report</div>
    <div class="date">Generated on ${date}</div>
  </div>

  <!-- Executive Summary -->
  <div class="section">
    <h2>📊 Executive Summary</h2>
    <div class="summary">
      <div class="stat-box"><div class="number">${totalUsers}</div><div class="label">Total Users</div></div>
      <div class="stat-box"><div class="number">${activePartners}</div><div class="label">Active Couples</div></div>
      <div class="stat-box"><div class="number">${totalDates}</div><div class="label">Dates Planned</div></div>
      <div class="stat-box"><div class="number">${savedGifts.length}</div><div class="label">Gifts Saved</div></div>
    </div>
    <div class="insights">
      <div class="insight">
        <div class="title">Average Date Rating</div>
        <div class="value">${avgRating}${avgRating !== "N/A" ? " / 5" : ""}</div>
        <div class="detail">${ratedDates.length} dates rated by users</div>
      </div>
      <div class="insight">
        <div class="title">Engagement</div>
        <div class="value">${favoritedDates}</div>
        <div class="detail">Dates favorited by users</div>
      </div>
      <div class="insight">
        <div class="title">Photo Memories</div>
        <div class="value">${photosUploaded}</div>
        <div class="detail">Photos uploaded to date entries</div>
      </div>
      <div class="insight">
        <div class="title">Community</div>
        <div class="value">${expertPosts.length}</div>
        <div class="detail">${expertReplies.length} replies across posts</div>
      </div>
    </div>
  </div>

  <!-- User Demographics -->
  <div class="section">
    <h2>👥 User Demographics</h2>
    <h3>Gender Breakdown</h3>
    <div class="bar-chart">
      ${Object.entries(genderCounts).map(([gender, count]) => {
        const pct = Math.round((count / Math.max(totalUsers, 1)) * 100);
        return `<div class="bar-row">
          <div class="bar-label">${gender}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.max(pct, 5)}%"><span>${count} (${pct}%)</span></div></div>
        </div>`;
      }).join("")}
    </div>
  </div>

  ${topVibes.length > 0 ? `
  <!-- Date Vibes -->
  <div class="section">
    <h2>✨ Most Popular Date Vibes</h2>
    <div class="bar-chart">
      ${topVibes.map(([vibe, count]) => {
        const pct = Math.round((count / maxVibeCount) * 100);
        return `<div class="bar-row">
          <div class="bar-label">${vibe}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.max(pct, 8)}%"><span>${count}</span></div></div>
        </div>`;
      }).join("")}
    </div>
  </div>` : ""}

  <!-- Bucket List Stats -->
  <div class="section">
    <h2>✅ Bucket List Overview</h2>
    <div class="insights">
      <div class="insight">
        <div class="title">Total Items</div>
        <div class="value">${bucketList.length}</div>
      </div>
      <div class="insight">
        <div class="title">Completed</div>
        <div class="value">${completedBucket} <span style="font-size:14px;color:#888;">(${bucketList.length > 0 ? Math.round(completedBucket / bucketList.length * 100) : 0}%)</span></div>
      </div>
    </div>
  </div>

  <!-- Special Events -->
  <div class="section">
    <h2>🎉 Special Events</h2>
    <p style="color:#666;margin-bottom:12px;">${specialEvents.length} special event${specialEvents.length !== 1 ? "s" : ""} tracked across all couples.</p>
    ${buildTable("special_events", specialEvents)}
  </div>

  <!-- Data Tables -->
  <div class="section">
    <h2>👤 User Profiles</h2>
    ${buildTable("profiles", profiles)}
  </div>

  <div class="section">
    <h2>📅 Calendar Entries</h2>
    <p style="color:#666;margin-bottom:12px;">${totalDates} date${totalDates !== 1 ? "s" : ""} planned — showing all entries with ratings and favorites.</p>
    ${buildTable("calendar_entries", calendarEntries)}
  </div>

  <div class="section">
    <h2>🎁 Saved Gifts</h2>
    ${buildTable("saved_gifts", savedGifts)}
  </div>

  <div class="section">
    <h2>💬 Community Forum</h2>
    <h3>Posts (${expertPosts.length})</h3>
    ${buildTable("expert_posts", expertPosts)}
    <h3>Replies (${expertReplies.length})</h3>
    ${buildTable("expert_replies", expertReplies)}
  </div>

  <div class="footer">
    Heart of Chat — Confidential Data Report — ${date}<br/>
    This report was automatically generated. Save as PDF using your browser's Print function (Ctrl/Cmd + P).
  </div>
</div>
</body>
</html>`;
}

const AdminDataExport = () => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  const exportTable = async (tableName: string, format: "csv" | "json" = "csv") => {
    setDownloading(tableName);
    try {
      const { data, error } = await supabase.rpc("admin_export_table", { _table_name: tableName });
      if (error) throw error;
      const rows = (data as any[]) || [];
      if (rows.length === 0) { toast.info(`No data in ${tableName}`); setDownloading(null); return; }
      if (format === "csv") {
        downloadFile(jsonToCsv(rows), `${tableName}_export.csv`, "text/csv");
      } else {
        downloadFile(JSON.stringify(rows, null, 2), `${tableName}_export.json`, "application/json");
      }
      toast.success(`Downloaded ${tableName} (${rows.length} rows)`);
    } catch (err: any) {
      toast.error(err.message || `Failed to export ${tableName}`);
    }
    setDownloading(null);
  };

  const exportAll = async () => {
    setDownloadingAll(true);
    const allData: Record<string, any[]> = {};
    for (const table of EXPORT_TABLES) {
      try {
        const { data, error } = await supabase.rpc("admin_export_table", { _table_name: table.name });
        if (!error && data) allData[table.name] = data as any[];
      } catch {}
    }
    downloadFile(JSON.stringify(allData, null, 2), `full_data_export_${new Date().toISOString().split("T")[0]}.json`, "application/json");
    for (const [tableName, rows] of Object.entries(allData)) {
      if (rows && rows.length > 0) downloadFile(jsonToCsv(rows), `${tableName}_export.csv`, "text/csv");
    }
    toast.success("All data exported!");
    setDownloadingAll(false);
  };

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const allData: Record<string, any[]> = {};
      for (const table of EXPORT_TABLES) {
        try {
          const { data, error } = await supabase.rpc("admin_export_table", { _table_name: table.name });
          if (!error && data) allData[table.name] = data as any[];
        } catch {}
      }
      const html = buildReportHTML(allData);
      // Open in new window so they can print → Save as PDF
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        toast.success("Report opened — use Ctrl/Cmd + P to save as PDF");
      } else {
        // Fallback: download as HTML file
        downloadFile(html, `heart_of_chat_report_${new Date().toISOString().split("T")[0]}.html`, "text/html");
        toast.success("Report downloaded as HTML — open in browser and print to PDF");
      }
    } catch (err: any) {
      toast.error("Failed to generate report");
    }
    setGeneratingReport(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Data Export</h2>
        <p className="text-muted-foreground text-sm">Download raw data or generate a human-readable report</p>
      </div>

      {/* Human-Readable Report */}
      <Card className="border-primary/40 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Human-Readable Report
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Beautiful formatted report with statistics, charts, and tables — save as PDF
              </p>
            </div>
            <Button
              onClick={generateReport}
              disabled={generatingReport}
              size="lg"
              className="gap-2"
            >
              {generatingReport ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><FileText className="h-4 w-4" /> Generate Report</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export All Raw Data */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Export Raw Data</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Download all tables as individual CSVs plus a combined JSON file
              </p>
            </div>
            <Button
              variant="outline"
              onClick={exportAll}
              disabled={downloadingAll}
              size="lg"
              className="gap-2"
            >
              {downloadingAll ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Exporting...</>
              ) : (
                <><Download className="h-4 w-4" /> Export All Data</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Tables */}
      <div className="grid gap-3">
        {EXPORT_TABLES.map((table) => (
          <Card key={table.name}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{table.icon}</span>
                  <div>
                    <h4 className="font-medium text-foreground">{table.label}</h4>
                    <p className="text-xs text-muted-foreground font-mono">{table.name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportTable(table.name, "csv")} disabled={downloading === table.name} className="gap-1.5 text-xs">
                    {downloading === table.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportTable(table.name, "json")} disabled={downloading === table.name} className="gap-1.5 text-xs">
                    {downloading === table.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                    JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDataExport;
