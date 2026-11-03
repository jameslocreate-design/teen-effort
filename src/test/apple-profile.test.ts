import { describe, it, expect } from "vitest";
import type { User } from "@supabase/supabase-js";
import { appleNames, isAppleUser, needsNameStep, beginAppleHandoff, waitForAppleHandoff } from "@/lib/apple-profile";
import { deleteAccountInOrder } from "../../supabase/functions/_shared/account-deletion";

const user = (metadata = {}): User => ({ id: "apple-account", app_metadata: { provider: "apple" }, user_metadata: metadata, aud: "authenticated", created_at: "2026-11-02" });
describe("Apple review rules", () => {
  it("never requires Apple users to provide a name", () => {
    expect(needsNameStep(false, "apple")).toBe(false);
  });
  it("keeps required name entry for email users without a name", () => {
    expect(needsNameStep(false, "email")).toBe(true);
  });
  it("preserves given and family names as full metadata", () => {
    expect(appleNames(user(), "James", "Lo")).toEqual({ full_name: "James Lo", given_name: "James", family_name: "Lo" });
  });
  it("uses an editable fallback when Apple returns a blank name", () => {
    expect(appleNames(user(), "", null).full_name).toBe("Apple user");
  });
  it("keeps Apple's name on subsequent authorizations without a name", () => {
    expect(appleNames(user({ full_name: "James Lo", given_name: "James", family_name: "Lo" })).full_name).toBe("James Lo");
  });
  it("recognizes an Apple identity on a linked account", () => {
    expect(isAppleUser({ app_metadata: { provider: "email" }, identities: [{ provider: "apple" } as User["identities"][number]] })).toBe(true);
  });
  it("holds session publication until first-name persistence finishes", async () => {
    const finish = beginAppleHandoff();
    let published = false;
    const task = waitForAppleHandoff().then(() => { published = true; });
    await Promise.resolve();
    expect(published).toBe(false);
    finish(); await task;
    expect(published).toBe(true);
  });
  it("revokes before deleting files, rows, auth or stored credentials", async () => {
    const order: string[] = [];
    await deleteAccountInOrder({
      revoke: async () => { order.push("revoke"); }, files: async () => { order.push("files"); },
      rows: async () => { order.push("rows"); }, auth: async () => { order.push("auth"); }, token: async () => { order.push("token"); },
    });
    expect(order).toEqual(["revoke", "files", "rows", "auth", "token"]);
  });
  it("does not delete anything if Apple revocation fails", async () => {
    const deleted: string[] = [];
    await expect(deleteAccountInOrder({
      revoke: async () => { throw new Error("Apple unavailable"); }, files: async () => { deleted.push("files"); },
      rows: async () => { deleted.push("rows"); }, auth: async () => { deleted.push("auth"); }, token: async () => { deleted.push("token"); },
    })).rejects.toThrow("Apple unavailable");
    expect(deleted).toEqual([]);
  });
});