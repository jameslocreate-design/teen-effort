import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { appleNames, APPLE_FALLBACK_NAME } from "./apple-profile";

export async function persistAppleProfile(user: User, givenName?: string | null, familyName?: string | null) {
  const names = appleNames(user, givenName, familyName);
  const { data, error } = await supabase.auth.updateUser({ data: names });
  if (error) throw error;
  const { data: profile, error: readError } = await supabase.from("profiles").select("name").eq("user_id", user.id).single();
  if (readError) throw readError;
  // Keep a name edited in Profile settings on subsequent authorizations.
  const suppliedName = !!givenName?.trim() || !!familyName?.trim();
  const displayName = suppliedName || !profile.name || profile.name === APPLE_FALLBACK_NAME ? names.full_name : profile.name;
  const { error: profileError } = await supabase.from("profiles").update({ name: displayName, display_name: displayName }).eq("user_id", user.id);
  if (profileError) throw profileError;
  return data.user ?? user;
}