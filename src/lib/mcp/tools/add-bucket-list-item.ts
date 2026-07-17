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
  name: "add_bucket_list_item",
  title: "Add bucket list item",
  description: "Add a new item to the couple's shared bucket list. Requires the user to be linked with a partner.",
  inputSchema: {
    title: z.string().trim().min(1).describe("Short title of the bucket list item."),
    description: z.string().trim().optional().describe("Optional longer description."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, description }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const { data: link, error: linkErr } = await sb
      .from("partner_links")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (linkErr) return { content: [{ type: "text", text: linkErr.message }], isError: true };
    if (!link) return { content: [{ type: "text", text: "You need to link a partner before adding bucket list items." }], isError: true };
    const { data, error } = await sb
      .from("bucket_list")
      .insert({ partner_link_id: link.id, added_by: userId, title, description: description ?? null })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Added "${data.title}" to your bucket list.` }], structuredContent: { item: data } };
  },
});
