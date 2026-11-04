import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { nativeAppleSignIn } from "@/lib/appleSignIn";
import { waitForAppleHandoff } from "@/lib/apple-profile";
const mocks = vi.hoisted(() => ({ authorize: vi.fn(), signIn: vi.fn(), invoke: vi.fn(), persist: vi.fn(), signOut: vi.fn() }));
vi.mock("@capacitor-community/apple-sign-in", () => ({ SignInWithApple: { authorize: mocks.authorize } }));
vi.mock("@/lib/apple-profile-persistence", () => ({ persistAppleProfile: mocks.persist }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signInWithIdToken: mocks.signIn, signOut: mocks.signOut }, functions: { invoke: mocks.invoke } } }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("crypto", { randomUUID: () => "nonce", subtle: { digest: async () => new ArrayBuffer(32) } });
  mocks.authorize.mockResolvedValue({ response: { identityToken: "test-only-token", authorizationCode: "test-only-code", givenName: "James", familyName: "Lo" } });
  mocks.signIn.mockImplementation(async () => {
    // Emulate auth notifying its listener synchronously without awaiting the handoff.
    setTimeout(() => { void waitForAppleHandoff(); }, 0);
    return { data: { user: { id: "native-test" } }, error: null };
  });
  mocks.persist.mockResolvedValue({ id: "native-test" });
  mocks.invoke.mockResolvedValue({ error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("skips token storage when Apple supplies no authorization code", async () => {
  mocks.authorize.mockResolvedValue({ response: { identityToken: "test-only-token" } });
  expect(await nativeAppleSignIn()).toEqual({ tokenStored: false });
  expect(mocks.invoke).not.toHaveBeenCalled();
  expect(mocks.signOut).not.toHaveBeenCalled();
});
it("retries failed token storage exactly once", async () => {
  mocks.invoke.mockResolvedValueOnce({ error: new Error("temporary") });
  expect(await nativeAppleSignIn()).toEqual({ tokenStored: true });
  expect(mocks.invoke).toHaveBeenCalledTimes(2);
  expect(mocks.invoke).toHaveBeenLastCalledWith("apple-store-token", { body: { authorizationCode: "test-only-code" } });
});
it("continues signed in after two failed token-storage attempts", async () => {
  mocks.invoke.mockRejectedValue(new Error("offline"));
  expect(await nativeAppleSignIn()).toEqual({ tokenStored: false });
  expect(mocks.invoke).toHaveBeenCalledTimes(2);
  expect(mocks.signOut).not.toHaveBeenCalled();
  await waitForAppleHandoff();
});