import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ coords: vi.fn(), precision: "zip", fetch: vi.fn() }));
vi.mock("@/lib/geo", () => ({ getCurrentCoords: mocks.coords }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { access_token: "test-token", user: { id: "test-user" } } } }) },
  from: () => { const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { privacy_settings: { location_precision: mocks.precision } }, error: null }) }; return query; },
} }));
import { generateDateIdeas, type DateFilters } from "@/lib/date-planner";
const filters: DateFilters = { cost: null, location: null, activity: null, distance: null, timeRange: null, cuisine: null, latitude: 39.1031, longitude: -84.512, funActivity: null, mood: null };
beforeEach(() => {
  Object.defineProperty(AbortSignal, "timeout", { configurable: true, value: () => new AbortController().signal });
  mocks.precision = "zip";
  mocks.coords.mockReset().mockResolvedValue({ latitude: 40.08123, longitude: -82.80876 });
  mocks.fetch.mockReset().mockResolvedValue({ ok: true, json: async () => ({ address: { city: "New Albany", state: "Ohio" }, ideas: [] }) });
  vi.stubGlobal("fetch", mocks.fetch);
});
describe("fresh privacy-aware date generation", () => {
  it("replaces stale Cincinnati coordinates and rounds before all outbound requests", async () => {
    await generateDateIdeas(filters);
    expect(mocks.coords).toHaveBeenCalledWith({ fresh: true, timeout: 12000 });
    expect(mocks.fetch.mock.calls[0][0]).toContain("lat=40.08&lon=-82.81");
    const body = JSON.parse(mocks.fetch.mock.calls[1][1].body);
    expect(body.latitude).toBe(40.08); expect(body.longitude).toBe(-82.81);
  });
  it("preserves precise coordinates when the user allows them", async () => {
    mocks.precision = "precise";
    await generateDateIdeas(filters);
    expect(JSON.parse(mocks.fetch.mock.calls[1][1].body).latitude).toBe(40.08123);
  });
  it("never sends stale coordinates when a fresh position fails", async () => {
    mocks.coords.mockRejectedValue(new Error("denied"));
    await expect(generateDateIdeas(filters)).rejects.toThrow("Couldn't refresh your location");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});