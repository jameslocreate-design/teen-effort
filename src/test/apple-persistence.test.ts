import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { persistAppleProfile } from "@/lib/apple-profile-persistence";

const mocks = vi.hoisted(() => ({ updateUser: vi.fn(), read: vi.fn(), update: vi.fn(), insert: vi.fn(), signOut: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { updateUser: mocks.updateUser, signOut: mocks.signOut },
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }),
    update: (payload: unknown) => { mocks.update(payload); return { eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: { user_id: "apple-test" }, error: null }) }) }) }; },
    insert: mocks.insert,
  }),
} }));
const user = (id: string, metadata = {}): User => ({ id, app_metadata: { provider: "apple" }, user_metadata: metadata, aud: "authenticated", created_at: "2026-11-03" });
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  mocks.updateUser.mockResolvedValue({ data: {}, error: null });
  mocks.read.mockResolvedValue({ data: { name: "" }, error: null });
  mocks.insert.mockResolvedValue({ error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("Apple profile persistence", () => {
  it("keeps the session and first name pending after a save failure, then retries successfully", async () => {
    const original = user("retry-user");
    mocks.read.mockResolvedValueOnce({ data: null, error: new Error("offline") });
    const continued = await persistAppleProfile(original, "James", "Lo");
    expect(continued.id).toBe(original.id);
    expect(continued.user_metadata.full_name).toBe("James Lo");
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("te_pending_apple_name:retry-user") ?? "null").names.full_name).toBe("James Lo");
    const updated = vi.fn(); window.addEventListener("profile-updated", updated);
    await persistAppleProfile(original);
    expect(mocks.update).toHaveBeenCalledWith({ name: "James Lo", display_name: "James Lo" });
    expect(localStorage.getItem("te_pending_apple_name:retry-user")).toBeNull();
    expect(updated).toHaveBeenCalledOnce();
    window.removeEventListener("profile-updated", updated);
  });
  it("creates a missing profile using signup defaults and birthday metadata", async () => {
    mocks.read.mockResolvedValue({ data: null, error: null });
    await persistAppleProfile(user("missing-row", { birthday: "2005-02-03" }), "James", "Lo");
    expect(mocks.insert).toHaveBeenCalledWith({ user_id: "missing-row", birthday: "2005-02-03", name: "James Lo", display_name: "James Lo" });
  });
  it("accepts an empty Apple name without an error", async () => {
    await persistAppleProfile(user("blank-name"), "", "");
    expect(mocks.update).toHaveBeenCalledWith({ name: "Apple user", display_name: "Apple user" });
    expect(console.error).not.toHaveBeenCalled();
  });
  it("preserves a display name edited in the Profile tab", async () => {
    mocks.read.mockResolvedValue({ data: { name: "Jamie" }, error: null });
    await persistAppleProfile(user("edited-name", { full_name: "James Lo" }));
    expect(mocks.update).toHaveBeenCalledWith({ name: "Jamie", display_name: "Jamie" });
  });
  it("does not apply another account's pending name", async () => {
    localStorage.setItem("te_pending_apple_name:other-account", JSON.stringify({ names: { full_name: "Other Person", given_name: "Other", family_name: "Person" }, suppliedName: true }));
    await persistAppleProfile(user("isolated-account"));
    expect(mocks.update).toHaveBeenCalledWith({ name: "Apple user", display_name: "Apple user" });
  });
});