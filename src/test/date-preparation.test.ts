import { describe, expect, it } from "vitest";
import { dateStreak, preparationTasks, nextPlannedDate, defaultPreparation } from "@/lib/date-preparation";
describe("date widgets", () => {
  it("uses the user's preparation and travel estimates to schedule getting ready and leaving", () => {
    const tasks = preparationTasks({ id: "date", title: "Museum", date: "2026-10-24", event_time: "18:30" }, defaultPreparation);
    expect(new Date(tasks[0].at ?? "").getHours()).toBe(17);
    expect(new Date(tasks[0].at ?? "").getMinutes()).toBe(15);
    expect(new Date(tasks[2].at ?? "").getHours()).toBe(18);
    expect(new Date(tasks[2].at ?? "").getMinutes()).toBe(0);
  });
  it("does not invent times for dates without a time", () => {
    expect(preparationTasks({ id: "date", title: "Museum", date: "2026-10-24", event_time: null }, defaultPreparation).every(task => task.at === null)).toBe(true);
  });
  it("does not count future planned dates toward the streak", () => {
    expect(dateStreak(["2026-10-25", "2026-10-17", "2026-10-10"], new Date(2026, 9, 24))).toBe(2);
  });
  it("skips a date whose start time already passed", () => {
    expect(nextPlannedDate([{ id: "past", title: "Past", date: "2026-10-24", event_time: "10:00" }, { id: "next", title: "Next", date: "2026-10-24", event_time: "18:30" }], new Date(2026, 9, 24, 12))?.id).toBe("next");
  });
});