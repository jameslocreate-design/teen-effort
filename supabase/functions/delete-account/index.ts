import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the requesting user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const admin = createClient(supabaseUrl, serviceKey);

    // Best-effort cleanup of user-owned rows that don't cascade
    const tables = [
      "profiles", "calendar_entries", "bucket_list", "saved_gifts", "saved_date_ideas",
      "roulette_date_ideas", "expert_posts", "expert_replies", "wishlists", "referrals",
      "date_reviews", "quiz_answers", "love_letters", "appreciation_prompts",
      "vision_board_pins", "date_votes", "special_events", "user_roles", "partner_links",
    ];

    for (const t of tables) {
      if (t === "partner_links") {
        await admin.from(t).delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
      } else if (t === "love_letters" || t === "appreciation_prompts") {
        await admin.from(t).delete().eq("sender_id", userId);
      } else if (t === "calendar_entries" || t === "bucket_list" || t === "special_events" || t === "vision_board_pins") {
        await admin.from(t).delete().eq("added_by", userId);
      } else if (t === "referrals") {
        await admin.from(t).delete().or(`referrer_id.eq.${userId},referred_id.eq.${userId}`);
      } else {
        await admin.from(t).delete().eq("user_id", userId);
      }
    }

    // Delete every uploaded file (stored under "<userId>/..." in each bucket)
    const listAll = async (bucket: string, prefix: string): Promise<string[]> => {
      const out: string[] = [];
      const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
      for (const item of data ?? []) {
        const full = `${prefix}/${item.name}`;
        if (item.id) out.push(full);
        else out.push(...(await listAll(bucket, full)));
      }
      return out;
    };
    for (const bucket of ["avatars", "date-photos"]) {
      try {
        const paths = await listAll(bucket, userId);
        for (let i = 0; i < paths.length; i += 100) {
          await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
        }
      } catch (e) {
        console.error(`Failed to clear ${bucket}`, (e as Error).message);
      }
    }

    // Delete the auth user
    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      return new Response(JSON.stringify({ error: deleteErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
