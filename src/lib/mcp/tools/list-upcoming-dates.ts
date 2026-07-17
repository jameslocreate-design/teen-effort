import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_upcoming_dates",
  title: "List upcoming dates",
  description: "List the signed-in user's upcoming planned dates from their shared calendar, ordered soonest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max dates to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabaseForUser(ctx)
      .from("calendar_entries")
      .select("id, date, event_time, title, description, vibe, estimated_cost, duration")
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    const summary = rows.length === 0
      ? "No upcoming dates on the calendar."
      : rows.map((r) => `• ${r.date}${r.event_time ? ` @ ${r.event_time}` : ""} — ${r.title}${r.vibe ? ` (${r.vibe})` : ""}`).join("\n");
    return { content: [{ type: "text", text: summary }], structuredContent: { dates: rows } };
  },
});
