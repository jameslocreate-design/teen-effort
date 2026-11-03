import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { APPLE_CLIENT_ID, exchangeAppleCode } from "../_shared/apple-authorization.ts";

const bodySchema = z.object({ authorizationCode: z.string().min(1).max(4096) }).strict();
Deno.serve(async (req) => {
  const reply = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return reply({ error: "Service unavailable" }, 503);
    const authorization = req.headers.get("Authorization") || "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data, error } = await userClient.auth.getUser();
    if (error || !data.user) return reply({ error: "Unauthorized" }, 401);
    const identity = data.user.identities?.find((entry) => entry.provider === "apple");
    const sub = identity?.identity_data?.sub || identity?.id;
    if (typeof sub !== "string") return reply({ error: "Apple sign-in required" }, 403);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return reply({ error: "Invalid authorization code" }, 400);
    const refreshToken = await exchangeAppleCode(parsed.data.authorizationCode, sub);
    const admin = createClient(url, service);
    const { error: storeError } = await admin.from("apple_authorization_tokens").upsert({
      user_id: data.user.id, apple_sub: sub, client_id: APPLE_CLIENT_ID, refresh_token: refreshToken, updated_at: new Date().toISOString(),
    });
    if (storeError) return reply({ error: "Could not securely save Apple authorization" }, 500);
    return reply({ success: true });
  } catch (error) {
    const setup = error instanceof Error && error.message === "APPLE_SETUP_REQUIRED";
    return reply({ error: setup ? "Apple account disconnection needs configuration" : "Could not save Apple authorization. Sign in with Apple again to retry." }, setup ? 503 : 400);
  }
});