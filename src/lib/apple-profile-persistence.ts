import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { appleNames, APPLE_FALLBACK_NAME } from "./apple-profile";

type PendingName = { names: ReturnType<typeof appleNames>; suppliedName: boolean };
const pendingKey = (id: string) => `te_pending_apple_name:${id}`;
const memoryPending = new Map<string, PendingName>();
const activeSaves = new Map<string, Promise<User>>();

function readPending(id: string): PendingName | undefined {
  const cached = memoryPending.get(id);
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(pendingKey(id));
    if (!raw) return;
    const value = JSON.parse(raw);
    if (typeof value?.names?.full_name === "string" && typeof value.names.given_name === "string" && typeof value.names.family_name === "string" && typeof value.suppliedName === "boolean") return value;
  } catch (error) { console.error("Apple pending name could not be read", error); }
}

export function hasPendingAppleProfile(id: string) { return !!readPending(id); }

function storePending(id: string, value: PendingName) {
  memoryPending.set(id, value);
  try { localStorage.setItem(pendingKey(id), JSON.stringify(value)); }
  catch (error) { console.error("Apple pending name could not be stored", error); }
}

async function saveProfile(user: User, pending: PendingName): Promise<User> {
  const { names, suppliedName } = pending;
  // Keep the first-authorization name available even if Cloud is temporarily unavailable.
  let updatedUser = { ...user, user_metadata: { ...user.user_metadata, ...names } };
  storePending(user.id, pending);
  try {
    if (Object.entries(names).some(([key, value]) => user.user_metadata[key] !== value)) {
      const { data, error } = await supabase.auth.updateUser({ data: names });
      if (error) throw error;
      updatedUser = data.user ?? updatedUser;
    }
    const { data: profile, error: readError } = await supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle();
    if (readError) throw readError;
    // Preserve display names edited later in the Profile tab.
    const displayName = suppliedName || !profile?.name || profile.name === APPLE_FALLBACK_NAME ? names.full_name : profile.name;
    const payload = { name: displayName, display_name: displayName };
    if (profile) {
      const { data: saved, error } = await supabase.from("profiles").update(payload).eq("user_id", user.id).select("user_id").maybeSingle();
      if (error) throw error;
      if (!saved) throw new Error("Apple profile update did not save a row");
    } else {
      // Match normal signup: defaults supply the ID/partner code, and DOB comes from metadata.
      const birthday = typeof user.user_metadata.birthday === "string" && user.user_metadata.birthday ? user.user_metadata.birthday : null;
      const { error } = await supabase.from("profiles").insert({ user_id: user.id, birthday, ...payload });
      if (error?.code === "23505") {
        // The normal signup trigger may have created the row between the read and insert.
        const { data: saved, error: retryError } = await supabase.from("profiles").update(payload).eq("user_id", user.id).select("user_id").maybeSingle();
        if (retryError) throw retryError;
        if (!saved) throw new Error("Apple profile update did not save a row");
      } else if (error) throw error;
    }
    memoryPending.delete(user.id);
    try { localStorage.removeItem(pendingKey(user.id)); }
    catch (error) { console.error("Apple pending name could not be cleared", error); }
    window.dispatchEvent(new Event("profile-updated"));
  } catch (error) {
    console.error("Apple profile save failed; name retained for retry", error);
    // Profile failures must never terminate an authenticated session.
  }
  return updatedUser;
}

export async function persistAppleProfile(user: User, givenName?: string | null, familyName?: string | null): Promise<User> {
  const suppliedName = !!givenName?.trim() || !!familyName?.trim();
  const pending = suppliedName ? { names: appleNames(user, givenName, familyName), suppliedName } : readPending(user.id) ?? { names: appleNames(user), suppliedName: false };
  const active = activeSaves.get(user.id);
  if (active) {
    await active;
    if (!suppliedName) return persistAppleProfile(user, givenName, familyName);
  }
  const task = saveProfile(user, pending);
  activeSaves.set(user.id, task);
  try { return await task; }
  finally { if (activeSaves.get(user.id) === task) activeSaves.delete(user.id); }
}