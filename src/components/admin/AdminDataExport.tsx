import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileDown, Loader2, CheckCircle2 } from "lucide-react";
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
];

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
        // Escape CSV special chars
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

const AdminDataExport = () => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const exportTable = async (tableName: string, format: "csv" | "json" = "csv") => {
    setDownloading(tableName);
    try {
      const { data, error } = await supabase.rpc("admin_export_table", { _table_name: tableName });
      if (error) throw error;

      const rows = (data as any[]) || [];
      if (rows.length === 0) {
        toast.info(`No data in ${tableName}`);
        setDownloading(null);
        return;
      }

      if (format === "csv") {
        const csv = jsonToCsv(rows);
        downloadFile(csv, `${tableName}_export.csv`, "text/csv");
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

    // Download as single JSON file
    downloadFile(
      JSON.stringify(allData, null, 2),
      `full_data_export_${new Date().toISOString().split("T")[0]}.json`,
      "application/json"
    );

    // Also download individual CSVs
    for (const [tableName, rows] of Object.entries(allData)) {
      if (rows && rows.length > 0) {
        const csv = jsonToCsv(rows);
        downloadFile(csv, `${tableName}_export.csv`, "text/csv");
      }
    }

    toast.success("All data exported!");
    setDownloadingAll(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Data Export</h2>
        <p className="text-muted-foreground text-sm">Download all application data as CSV or JSON files</p>
      </div>

      {/* Export All Button */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Export Everything</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Download all tables as individual CSVs plus a combined JSON file
              </p>
            </div>
            <Button
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportTable(table.name, "csv")}
                    disabled={downloading === table.name}
                    className="gap-1.5 text-xs"
                  >
                    {downloading === table.name ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileDown className="h-3.5 w-3.5" />
                    )}
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportTable(table.name, "json")}
                    disabled={downloading === table.name}
                    className="gap-1.5 text-xs"
                  >
                    {downloading === table.name ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileDown className="h-3.5 w-3.5" />
                    )}
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
