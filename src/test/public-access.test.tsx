import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Index from "@/pages/Index";
import AppEntry from "@/pages/AppEntry";

const mocks = vi.hoisted(() => ({ native: false, appEntry: vi.fn() }));
vi.mock("@/lib/native", () => ({ isNative: () => mocks.native }));
vi.mock("@/contexts/AuthContext", () => ({ AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/AppShell", () => ({ default: () => { mocks.appEntry(); return <div data-testid="account-entry" />; } }));
vi.mock("@/components/NativeWidgetSync", () => ({ default: () => null }));
afterEach(() => { cleanup(); mocks.native = false; mocks.appEntry.mockClear(); });

describe("Public homepage and account entry separation", () => {
  it("does not mount account or birthday verification on the web homepage, even with an age lock", () => {
    localStorage.setItem("age-gate-lock", String(Date.now() + 86400000));
    render(<MemoryRouter><Index /></MemoryRouter>);
    expect(mocks.appEntry).not.toHaveBeenCalled();
    expect(screen.queryByTestId("account-entry")).toBeNull();
    expect(screen.getByRole("link", { name: "Get started" }).getAttribute("href")).toBe("/app");
    localStorage.removeItem("age-gate-lock");
  });

  it("keeps the existing account verification flow at app entry", () => {
    render(<MemoryRouter><AppEntry /></MemoryRouter>);
    expect(mocks.appEntry).toHaveBeenCalled();
    expect(screen.getByTestId("account-entry")).toBeTruthy();
  });

  it("keeps installed apps entering through account verification", () => {
    mocks.native = true;
    render(<MemoryRouter><Index /></MemoryRouter>);
    expect(mocks.appEntry).toHaveBeenCalled();
    expect(screen.getByTestId("account-entry")).toBeTruthy();
  });
});