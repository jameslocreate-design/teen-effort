import { SignJWT, importPKCS8, createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

export const APPLE_CLIENT_ID = "com.teeneffort.app";
const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export async function appleClientSecret() {
  const team = Deno.env.get("APPLE_TEAM_ID");
  const keyId = Deno.env.get("APPLE_KEY_ID");
  const p8 = Deno.env.get("APPLE_P8");
  if (!team || !keyId || !p8) throw new Error("APPLE_SETUP_REQUIRED");
  const key = await importPKCS8(p8.replace(/\\n/g, "\n"), "ES256");
  return new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(team).setAudience("https://appleid.apple.com").setSubject(APPLE_CLIENT_ID)
    .setIssuedAt().setExpirationTime("5m").sign(key);
}

export async function exchangeAppleCode(code: string, expectedSub: string) {
  const response = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST", signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: APPLE_CLIENT_ID, client_secret: await appleClientSecret(), grant_type: "authorization_code", code }),
  });
  if (!response.ok) throw new Error("APPLE_EXCHANGE_FAILED");
  const tokens = await response.json();
  if (typeof tokens.id_token !== "string" || typeof tokens.refresh_token !== "string") throw new Error("APPLE_EXCHANGE_FAILED");
  const { payload } = await jwtVerify(tokens.id_token, appleKeys, { issuer: "https://appleid.apple.com", audience: APPLE_CLIENT_ID });
  if (payload.sub !== expectedSub) throw new Error("APPLE_IDENTITY_MISMATCH");
  return tokens.refresh_token as string;
}

export async function revokeAppleToken(refreshToken: string) {
  const response = await fetch("https://appleid.apple.com/auth/revoke", {
    method: "POST", signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: APPLE_CLIENT_ID, client_secret: await appleClientSecret(), token: refreshToken, token_type_hint: "refresh_token" }),
  });
  if (!response.ok) throw new Error("APPLE_REVOKE_FAILED");
}