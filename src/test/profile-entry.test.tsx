import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ProfileSetup from "@/components/ProfileSetup";

const mocks = vi.hoisted(() => ({ update: vi.fn(), error: vi.fn(), provider: "email" }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "test-user", app_metadata: { provider: mocks.provider } } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
  update: mocks.update,
}) } }));
vi.mock("@/lib/storage", () => ({ signedUrl: vi.fn() }));
vi.mock("@/lib/camera", () => ({ pickPhotoNative: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.provider = "email"; localStorage.clear(); });

it("requires a birthday before completing app-entry profile verification", () => {
  const onComplete = vi.fn();
  render(<ProfileSetup onComplete={onComplete} />);
  fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Test User" } });
  fireEvent.click(screen.getByRole("button", { name: "Save & Continue" }));
  expect(mocks.error).toHaveBeenCalledWith("Please enter your date of birth");
  expect(mocks.update).not.toHaveBeenCalled();
  expect(onComplete).not.toHaveBeenCalled();
});

it("Apple onboarding saves only the required birthday without replacing the name", async () => {
  mocks.provider = "apple";
  mocks.update.mockReturnValue({ eq: async () => ({ error: null }) });
  const onComplete = vi.fn();
  render(<ProfileSetup onboarding onComplete={onComplete} />);
  fireEvent.change(screen.getByPlaceholderText("Your birthday"), { target: { value: "2005-02-03" } });
  fireEvent.click(screen.getByRole("button", { name: "Save & Continue" }));
  await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  expect(mocks.update).toHaveBeenCalledWith({ birthday: "2005-02-03" });
});

it("Apple Profile tab permits optional display-name edits", async () => {
  mocks.provider = "apple";
  mocks.update.mockReturnValue({ eq: async () => ({ error: null }) });
  render(<ProfileSetup onComplete={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Jamie" } });
  fireEvent.change(screen.getByPlaceholderText("Your birthday"), { target: { value: "2005-02-03" } });
  fireEvent.click(screen.getByRole("button", { name: "Save & Continue" }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ name: "Jamie", display_name: "Jamie" })));
});