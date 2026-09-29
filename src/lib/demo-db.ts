/**
 * Tiny localStorage-backed store used by the demo build so testers can add,
 * edit and delete their own items without any backend, database or account.
 */

const PREFIX = "demo-db:";

export interface DemoRow {
  id: string;
  created_at: string;
  [key: string]: any;
}

function key(table: string) {
  return `${PREFIX}${table}`;
}

export function demoSelect<T extends DemoRow>(table: string): T[] {
  try {
    const raw = localStorage.getItem(key(table));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function persist(table: string, rows: DemoRow[]) {
  try {
    localStorage.setItem(key(table), JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

export function demoInsert<T extends DemoRow>(table: string, row: Omit<T, "id" | "created_at">): T {
  const rows = demoSelect<T>(table);
  const created = {
    ...(row as any),
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    created_at: new Date().toISOString(),
  } as T;
  persist(table, [...rows, created]);
  return created;
}

export function demoUpdate<T extends DemoRow>(table: string, id: string, patch: Partial<T>): void {
  const rows = demoSelect<T>(table).map((r) => (r.id === id ? { ...r, ...patch } : r));
  persist(table, rows);
}

export function demoDelete(table: string, id: string): void {
  persist(
    table,
    demoSelect(table).filter((r) => r.id !== id),
  );
}
