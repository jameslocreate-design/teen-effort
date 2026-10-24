import { describe, expect, it, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ native: false, ios: true, setDashboard: vi.fn().mockResolvedValue(undefined), setTimeTogether: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@capacitor/core", () => ({ registerPlugin: () => mocks }));
vi.mock("@/lib/native", () => ({ isNative: () => mocks.native, isIOS: () => mocks.ios }));
import { syncDashboardWidgets } from "@/lib/widgetSync";
beforeEach(() => { mocks.native = false; mocks.ios = true; mocks.setDashboard.mockClear(); });
describe("iPhone widget bridge", () => {
  it("does not call native widgets on web", async () => { await syncDashboardWidgets(null); expect(mocks.setDashboard).not.toHaveBeenCalled(); });
  it("sends derived distance and checklist data and clears it on logout", async () => {
    mocks.native = true;
    const snapshot = { distance: "About 100 miles apart", dates: ["2026-10-24"], preparation: { title: "Museum", date: "2026-10-24", eventTime: "18:30", tasks: [{ label: "Leave", at: 1792864800000, completed: false }] } };
    await syncDashboardWidgets(snapshot);
    expect(mocks.setDashboard).toHaveBeenCalledWith({ snapshot: JSON.stringify(snapshot) });
    await syncDashboardWidgets(null);
    expect(mocks.setDashboard).toHaveBeenLastCalledWith({ snapshot: null });
  });
});