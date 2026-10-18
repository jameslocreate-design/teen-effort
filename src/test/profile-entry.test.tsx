import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ProfileSetup from "@/components/ProfileSetup";

const mocks = vi.hoisted(() => ({ update: vi.fn(), error: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "test-user" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }),
  update: mocks.update,
}) } }));
vi.mock("@/lib/storage", () => ({ signedUrl: vi.fn() }));
vi.mock("@/lib/camera", () => ({ pickPhotoNative: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("requires a birthday before completing app-entry profile verification", () => {
  const onComplete = vi.fn();
  render(<ProfileSetup onComplete={onComplete} />);
  fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Test User" } });
  fireEvent.click(screen.getByRole("button", { name: "Save & Continue" }));
  expect(mocks.error).toHaveBeenCalledWith("Please enter your date of birth");
  expect(mocks.update).not.toHaveBeenCalled();
  expect(onComplete).not.toHaveBeenCalled();
});