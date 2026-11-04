import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
const mocks = vi.hoisted(() => ({ listener: undefined as undefined | ((event: string, session: unknown) => unknown), handoff: vi.fn(), persist: vi.fn(), signOut: vi.fn() }));
const appleUser = { id: "apple-auth-test", app_metadata: { provider: "apple" }, user_metadata: {} };
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {
  onAuthStateChange: (callback: typeof mocks.listener) => { mocks.listener = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
  getSession: async () => ({ data: { session: null } }),
  getUser: async () => ({ data: { user: appleUser }, error: null }),
  signOut: mocks.signOut,
} } }));
vi.mock("@/lib/apple-profile", () => ({ isAppleUser: () => true, waitForAppleHandoff: mocks.handoff }));
vi.mock("@/lib/apple-profile-persistence", () => ({ persistAppleProfile: mocks.persist, hasPendingAppleProfile: () => false }));
vi.mock("@/lib/push", () => ({ registerPush: async () => {} }));
vi.mock("@/lib/reminders", () => ({ syncDateReminders: async () => {}, initReminderTaps: async () => {}, startPartnerActivityWatch: async () => {}, stopPartnerActivityWatch: vi.fn() }));
vi.mock("@/lib/revenuecat", () => ({ initPurchases: async () => {}, logOutPurchases: async () => {} }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function Status() { const { user, loading } = useAuth(); return <p>{loading ? "loading" : user?.id ?? "signed out"}</p>; }
it("returns from the auth callback before waiting for the Apple handoff and continues after a profile error", async () => {
  mocks.handoff.mockResolvedValue(undefined);
  mocks.persist.mockRejectedValue(new Error("profile unavailable"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  render(<AuthProvider><Status /></AuthProvider>);
  await screen.findByText("signed out");
  const returned = mocks.listener?.("SIGNED_IN", { user: appleUser });
  expect(returned).toBeUndefined();
  expect(mocks.handoff).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByText("apple-auth-test")).toBeInTheDocument());
  expect(mocks.persist).toHaveBeenCalledWith(appleUser);
  expect(mocks.signOut).not.toHaveBeenCalled();
  log.mockRestore();
});