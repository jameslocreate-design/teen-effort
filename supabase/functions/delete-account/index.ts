import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { APPLE_CLIENT_ID, revokeAppleToken } from "../_shared/apple-authorization.ts";
import { deleteAccountInOrder } from "../_shared/account-deletion.ts";

Deno.serve(async (req) => {
  const reply = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return reply({ error: "Service unavailable" }, 503);
    const userClient = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
    const { data, error } = await userClient.auth.getUser();
    if (error || !data.user) return reply({ error: "Unauthorized" }, 401);
    const user = data.user;
    const admin = createClient(url, service);
    const apple = user.identities?.find((identity) => identity.provider === "apple");
    const { data: stored, error: tokenError } = await admin.from("apple_authorization_tokens").select("refresh_token, apple_sub, client_id").eq("user_id", user.id).maybeSingle();
    if (tokenError) throw new Error("TOKEN_READ_FAILED");
    if (apple && !stored) return reply({ error: "Sign in with Apple again on your iPhone before deleting your account so we can disconnect Apple safely.", code: "APPLE_REAUTH_REQUIRED" }, 409);
    if (stored && (stored.client_id !== APPLE_CLIENT_ID || stored.apple_sub !== (apple?.identity_data?.sub || apple?.id))) throw new Error("TOKEN_IDENTITY_MISMATCH");

    const check = (result: { error: unknown }) => { if (result.error) throw new Error("CLEANUP_FAILED"); };
    const listAll = async (bucket: string, prefix: string): Promise<string[]> => {
      const out: string[] = [];
      for (let offset = 0; ; offset += 1000) {
        const result = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset });
        check(result);
        for (const item of result.data ?? []) {
          const path = `${prefix}/${item.name}`;
          if (item.id) out.push(path); else out.push(...await listAll(bucket, path));
        }
        if ((result.data?.length ?? 0) < 1000) break;
      }
      return out;
    };
    await deleteAccountInOrder({
      revoke: async () => { if (stored) await revokeAppleToken(stored.refresh_token); },
      files: async () => {
        for (const bucket of ["avatars", "date-photos"]) {
          const paths = await listAll(bucket, user.id);
          for (let i = 0; i < paths.length; i += 100) check(await admin.storage.from(bucket).remove(paths.slice(i, i + 100)));
        }
      },
      rows: async () => {
        // Remove dependent shared rows before partner links; include both partners' link-owned rows.
        const links = await admin.from("partner_links").select("id").or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
        check(links);
        const ids = (links.data ?? []).map((link) => link.id);
        for (const table of ["calendar_entries", "bucket_list", "wishlists", "quiz_answers", "love_letters", "appreciation_prompts", "vision_board_pins", "date_votes", "special_events"]) {
          if (ids.length) check(await admin.from(table).delete().in("partner_link_id", ids));
        }
        const posts = await admin.from("expert_posts").select("id").eq("user_id", user.id);
        check(posts);
        if (posts.data?.length) check(await admin.from("expert_replies").delete().in("post_id", posts.data.map((post) => post.id)));
        for (const table of ["saved_gifts", "saved_date_ideas", "roulette_date_ideas", "expert_replies", "expert_posts", "date_reviews", "subscriptions", "usage_limits", "push_tokens", "user_roles"]) {
          check(await admin.from(table).delete().eq("user_id", user.id));
        }
        check(await admin.from("referrals").delete().or(`referrer_id.eq.${user.id},referred_id.eq.${user.id}`));
        check(await admin.from("blocked_users").delete().or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`));
        check(await admin.from("content_reports").delete().or(`reporter_id.eq.${user.id},reported_user_id.eq.${user.id}`));
        check(await admin.from("partner_links").delete().or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`));
        check(await admin.from("profiles").delete().eq("user_id", user.id));
      },
      auth: async () => { check(await admin.auth.admin.deleteUser(user.id)); },
      token: async () => { check(await admin.from("apple_authorization_tokens").delete().eq("user_id", user.id)); },
    });
    return reply({ success: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return reply({ error: code === "APPLE_SETUP_REQUIRED" ? "Apple account disconnection needs configuration. Your account was not deleted." : code === "APPLE_REVOKE_FAILED" ? "Could not disconnect Apple. Your account was not deleted. Please try again." : "Account deletion could not finish. Please try again." }, 503);
  }
});