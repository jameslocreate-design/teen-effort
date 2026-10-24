import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatePreparation from "@/components/DatePreparation";
import { readPreparation } from "@/lib/date-preparation";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "widget-user" } }) }));
beforeEach(() => localStorage.clear());
afterEach(cleanup);
describe("personal preparation checklist", () => {
  it("persists edits and completed tasks for only that user and date", () => {
    render(<DatePreparation date={{ id: "planned-date", title: "Museum", date: "2026-10-24", event_time: "18:30" }} />);
    fireEvent.change(screen.getByLabelText("Travel estimate minutes"), { target: { value: "35" } });
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(readPreparation("widget-user", "planned-date").travelMinutes).toBe(35);
    expect(readPreparation("widget-user", "planned-date").completed).toEqual(["ready"]);
    expect(readPreparation("other-user", "planned-date").completed).toEqual([]);
    expect(readPreparation("widget-user", "other-date").travelMinutes).toBe(20);
  });
});