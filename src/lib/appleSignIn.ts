import { supabase } from "@/integrations/supabase/client";
import { beginAppleHandoff } from "./apple-profile";
import { persistAppleProfile } from "./apple-profile-persistence";

const sha256Hex = async (input: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * Native Sign in with Apple (iOS). Apple receives the SHA-256 of the nonce;
 * the backend receives the raw nonce with the identity token, so it can verify.
 * No web OAuth redirect is involved.
 */
export async function nativeAppleSignIn(): Promise<{ cancelled?: boolean; tokenStored?: boolean }> {
  const finishHandoff = beginAppleHandoff();
  try {
  const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
  const rawNonce = crypto.randomUUID() + crypto.randomUUID();
  const hashedNonce = await sha256Hex(rawNonce);
  let res;
  try {
    res = await SignInWithApple.authorize({
      clientId: "com.teeneffort.app",
      redirectURI: "https://teeneffort.app",
      scopes: "email name",
      nonce: hashedNonce,
    });
  } catch (err: any) {
    if (/cancel|1001/i.test(String(err?.message || err?.code || err))) return { cancelled: true };
    throw err;
  }
  const token = res.response.identityToken;
  if (!token) throw new Error("Apple did not return an identity token");
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: "apple", token, nonce: rawNonce });
  if (error) throw error;
  if (!data.user) throw new Error("Apple sign-in did not create a session");
  await persistAppleProfile(data.user, res.response.givenName, res.response.familyName);
  const authorizationCode = res.response.authorizationCode;
  if (!authorizationCode) return { tokenStored: false };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { error: storeError } = await supabase.functions.invoke("apple-store-token", {
        body: { authorizationCode },
      });
      if (!storeError) return { tokenStored: true };
      console.error("Apple token setup failed", storeError);
    } catch (error) { console.error("Apple token setup failed", error); }
  }
  return { tokenStored: false };
  } finally {
    finishHandoff();
  }
}
