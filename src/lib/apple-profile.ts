import type { User } from "@supabase/supabase-js";

export const APPLE_FALLBACK_NAME = "Apple user";
export function isAppleUser(user: Pick<User, "app_metadata" | "identities"> | null) {
  return user?.app_metadata?.provider === "apple" || user?.identities?.some((identity) => identity.provider === "apple") === true;
}
export function needsNameStep(hasName: boolean, provider: string) {
  return !hasName && provider !== "apple";
}
export function appleNames(user: User, givenName?: string | null, familyName?: string | null) {
  const given = givenName?.trim() || user.user_metadata.given_name || "";
  const family = familyName?.trim() || user.user_metadata.family_name || "";
  const full = [given, family].filter(Boolean).join(" ") || user.user_metadata.full_name || user.user_metadata.name || APPLE_FALLBACK_NAME;
  return { full_name: full, given_name: given, family_name: family };
}

// Auth events fire inside signInWithIdToken, before the native caller can save Apple's one-time name.
let pending: Promise<void> | null = null;
export function beginAppleHandoff() {
  let release = () => {};
  pending = new Promise<void>((resolve) => { release = resolve; });
  return () => { release(); pending = null; };
}
export async function waitForAppleHandoff() { await pending; }