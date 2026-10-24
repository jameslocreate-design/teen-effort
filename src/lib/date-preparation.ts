import { format, startOfWeek, subWeeks, endOfWeek } from "date-fns";

export interface PlannedDate { id: string; title: string; date: string; event_time: string | null }
export interface PreparationSettings { readyMinutes: number; travelMinutes: number; bufferMinutes: number; completed: string[] }
export const defaultPreparation: PreparationSettings = { readyMinutes: 45, travelMinutes: 20, bufferMinutes: 10, completed: [] };
export const PREPARATION_EVENT = "date-preparation-changed";
export interface PreparationTask { id: string; label: string; at: string | null; completed: boolean }

export function dateStreak(dates: string[], now = new Date()) {
  const today = format(now, "yyyy-MM-dd");
  const past = dates.filter(date => date <= today);
  let streak = 0;
  for (let i = 0; i < 104; i++) {
    const week = subWeeks(now, i);
    const start = format(startOfWeek(week, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const end = format(endOfWeek(week, { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (past.some(date => date >= start && date <= end)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

// Date-only comparisons remain local ISO; convert only to calculate clock times.
export function plannedTimestamp(date: PlannedDate) {
  if (!date.event_time || !/^\d{2}:\d{2}/.test(date.event_time)) return null;
  const time = new Date(`${date.date}T${date.event_time.slice(0, 5)}:00`);
  return Number.isFinite(time.getTime()) ? time : null;
}

export function nextPlannedDate(dates: PlannedDate[], now = new Date()) {
  const today = format(now, "yyyy-MM-dd");
  return dates.filter(date => date.date >= today && (!plannedTimestamp(date) || Number(plannedTimestamp(date)) > now.getTime()))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.event_time || "23:59").localeCompare(b.event_time || "23:59"))[0] ?? null;
}

export function preparationTasks(date: PlannedDate, settings: PreparationSettings): PreparationTask[] {
  const target = plannedTimestamp(date);
  const at = (minutes: number) => target ? new Date(target.getTime() - minutes * 60_000).toISOString() : null;
  const tasks = [
    { id: "ready", label: "Start getting ready", at: at(settings.readyMinutes + settings.travelMinutes + settings.bufferMinutes) },
    { id: "pack", label: "Check tickets, essentials & weather", at: at(settings.travelMinutes + settings.bufferMinutes + 5) },
    { id: "leave", label: "Leave for your date", at: at(settings.travelMinutes + settings.bufferMinutes) },
    { id: "arrive", label: "Arrive", at: at(settings.bufferMinutes) },
  ];
  return tasks.map(task => ({ ...task, completed: settings.completed.includes(task.id) }));
}

const key = (userId: string, dateId: string) => `date-preparation:${userId}:${dateId}`;
export function readPreparation(userId: string, dateId: string): PreparationSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(key(userId, dateId)) || "null");
    const minutes = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(240, value)) : fallback;
    return { readyMinutes: minutes(saved?.readyMinutes, 45), travelMinutes: minutes(saved?.travelMinutes, 20), bufferMinutes: minutes(saved?.bufferMinutes, 10), completed: Array.isArray(saved?.completed) ? saved.completed.filter((v: unknown) => typeof v === "string") : [] };
  } catch { return { ...defaultPreparation, completed: [] }; }
}
export function savePreparation(userId: string, dateId: string, settings: PreparationSettings) {
  localStorage.setItem(key(userId, dateId), JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(PREPARATION_EVENT));
}