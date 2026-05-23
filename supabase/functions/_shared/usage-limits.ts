import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const LIMITS = {
  date_ideas: 5,
  gift_ideas: 2,
} as const;

export type FeatureKey = keyof typeof LIMITS;

export interface UsageCheckResult {
  allowed: boolean;
  subscribed: boolean;
  count: number;
  remaining: number | null;
  limit: number;
  userId: string;
}

/**
 * Authenticate the caller and atomically check/increment their monthly usage
 * for the given feature. Returns the result so callers can include `remaining`
 * in their response headers / body, or short-circuit with a 403 when not
 * allowed.
 *
 * Throws on missing/invalid auth so callers can return 401.
 */
export async function checkAndIncrementUsage(
  req: Request,
  feature: FeatureKey,
): Promise<UsageCheckResult> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Missing Authorization header");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    throw new Error("Unauthorized");
  }
  const userId = userData.user.id;

  const limit = LIMITS[feature];
  const { data, error } = await admin.rpc("check_and_increment_usage", {
    _user_id: userId,
    _feature: feature,
    _limit: limit,
  });
  if (error) {
    console.error("check_and_increment_usage error", error);
    throw new Error("Usage check failed");
  }

  const row = (data ?? {}) as {
    allowed: boolean;
    subscribed: boolean;
    count: number;
    remaining: number | null;
    limit: number;
  };

  return { ...row, userId };
}
