import { supabase } from "@/integrations/supabase/client";

const sha256Hex = async (input: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * Native Sign in with Apple (iOS). Apple receives the SHA-256 of the nonce;
 * the backend receives the raw nonce with the identity token, so it can verify.
 * No web OAuth redirect is involved.
 */
export async function nativeAppleSignIn(): Promise<{ cancelled?: boolean }> {
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
  const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token, nonce: rawNonce });
  if (error) throw error;
  return {};
}
