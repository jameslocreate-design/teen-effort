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
  name: "list_bucket_list",
  title: "List couple bucket list",
  description: "List items on the shared couple's bucket list (linked partner scope).",
  inputSchema: {
    include_completed: z.boolean().optional().describe("Include completed items (default false)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ include_completed }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("bucket_list")
      .select("id, title, description, completed, completed_at, created_at")
      .order("created_at", { ascending: false });
    if (!include_completed) q = q.eq("completed", false);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    const summary = rows.length === 0
      ? "Bucket list is empty."
      : rows.map((r) => `${r.completed ? "✓" : "•"} ${r.title}`).join("\n");
    return { content: [{ type: "text", text: summary }], structuredContent: { items: rows } };
  },
});
