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
  name: "list_saved_date_ideas",
  title: "List saved date ideas",
  description: "List date ideas the signed-in user has bookmarked in Teen Effort.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max ideas to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("saved_date_ideas")
      .select("id, title, description, vibe, estimated_cost, duration, distance_miles, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    const summary = rows.length === 0
      ? "No saved date ideas yet."
      : rows.map((r) => `• ${r.title}${r.vibe ? ` — ${r.vibe}` : ""}${r.estimated_cost ? ` (${r.estimated_cost})` : ""}`).join("\n");
    return { content: [{ type: "text", text: summary }], structuredContent: { ideas: rows } };
  },
});
