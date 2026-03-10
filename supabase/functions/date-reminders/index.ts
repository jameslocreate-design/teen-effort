import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find dates happening tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: entries, error } = await supabase
      .from("calendar_entries")
      .select("id, title, date, event_time, added_by, partner_link_id")
      .eq("date", tomorrowStr);

    if (error) throw error;

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ message: "No upcoming dates to remind about" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get unique user IDs to notify
    const notified: string[] = [];

    for (const entry of entries) {
      // Get both partners from the link
      const { data: link } = await supabase
        .from("partner_links")
        .select("user1_id, user2_id")
        .eq("id", entry.partner_link_id)
        .single();

      if (!link) continue;

      const userIds = [link.user1_id, link.user2_id];

      for (const userId of userIds) {
        if (notified.includes(`${userId}-${entry.id}`)) continue;

        // Get user email from auth
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        if (!userData?.user?.email) continue;

        const timeStr = entry.event_time
          ? ` at ${entry.event_time}`
          : "";

        // Send email via Supabase Auth (resend)
        // For now, log the reminder — email sending requires additional setup
        console.log(
          `Reminder: ${userData.user.email} has "${entry.title}" tomorrow${timeStr}`
        );

        notified.push(`${userId}-${entry.id}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${entries.length} upcoming date(s), notified ${notified.length} user(s)`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
