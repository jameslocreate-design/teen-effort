import { useCallback, useEffect, useMemo, useRef } from "react";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const ITEM_HEIGHT = 32;
const VISIBLE = 3; // must be odd
const PAD = (VISIBLE - 1) / 2;

interface WheelProps {
  values: { value: number; label: string }[];
  selected: number;
  onChange: (value: number) => void;
  ariaLabel: string;
}

const Wheel = ({ values, selected, onChange, ariaLabel }: WheelProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProgrammatic = useRef(false);

  const index = Math.max(0, values.findIndex((v) => v.value === selected));

  // Keep scroll position in sync with the selected value.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = index * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - target) > 1) {
      isProgrammatic.current = true;
      el.scrollTo({ top: target, behavior: "auto" });
      window.setTimeout(() => { isProgrammatic.current = false; }, 50);
    }
  }, [index]);

  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el || isProgrammatic.current) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const i = Math.min(
        values.length - 1,
        Math.max(0, Math.round(el.scrollTop / ITEM_HEIGHT))
      );
      const next = values[i];
      if (next && next.value !== selected) onChange(next.value);
      el.scrollTo({ top: i * ITEM_HEIGHT, behavior: "smooth" });
    }, 110);
  }, [values, selected, onChange]);

  return (
    <div className="relative flex-1 min-w-0">
      <div
        ref={ref}
        role="listbox"
        aria-label={ariaLabel}
        onScroll={handleScroll}
        className="relative overflow-y-auto no-scrollbar snap-y snap-mandatory touch-pan-y"
        style={{ height: VISIBLE * ITEM_HEIGHT, scrollbarWidth: "none" }}
      >
        <div style={{ height: PAD * ITEM_HEIGHT }} />
        {values.map((v) => {
          const active = v.value === selected;
          return (
            <button
              key={v.value}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onChange(v.value)}
              className={`w-full snap-center flex items-center justify-center text-sm transition-colors ${
                active ? "text-foreground font-semibold" : "text-muted-foreground/60"
              }`}
              style={{ height: ITEM_HEIGHT }}
            >
              {v.label}
            </button>
          );
        })}
        <div style={{ height: PAD * ITEM_HEIGHT }} />
      </div>
    </div>
  );
};

interface DateOfBirthWheelProps {
  /** yyyy-MM-dd or "" */
  value: string;
  onChange: (value: string) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

const DateOfBirthWheel = ({ value, onChange }: DateOfBirthWheelProps) => {
  const today = new Date();
  const maxYear = today.getFullYear();
  const minYear = maxYear - 100;

  const parsed = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (m) {
      return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
    }
    return { year: maxYear - 16, month: 1, day: 1 };
  }, [value, maxYear]);

  const daysInMonth = new Date(parsed.year, parsed.month, 0).getDate();

  // Ensure the parent always holds a concrete value once mounted.
  useEffect(() => {
    if (!value) {
      onChange(`${parsed.year}-${pad(parsed.month)}-${pad(parsed.day)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (year: number, month: number, day: number) => {
    const maxDay = new Date(year, month, 0).getDate();
    onChange(`${year}-${pad(month)}-${pad(Math.min(day, maxDay))}`);
  };

  const monthOptions = MONTHS.map((label, i) => ({ value: i + 1, label }));
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => ({
    value: i + 1,
    label: String(i + 1),
  }));
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, i) => ({
    value: maxYear - i,
    label: String(maxYear - i),
  }));

  return (
    <div className="rounded-xl border border-border bg-secondary/50 px-2 py-1">
      <div className="relative flex items-stretch gap-1">
        {/* selection highlight */}
        <div
          className="pointer-events-none absolute inset-x-0 rounded-lg bg-primary/10 border-y border-primary/30"
          style={{ top: PAD * ITEM_HEIGHT, height: ITEM_HEIGHT }}
        />
        <Wheel
          ariaLabel="Month of birth"
          values={monthOptions}
          selected={parsed.month}
          onChange={(m) => emit(parsed.year, m, parsed.day)}
        />
        <Wheel
          ariaLabel="Day of birth"
          values={dayOptions}
          selected={Math.min(parsed.day, daysInMonth)}
          onChange={(d) => emit(parsed.year, parsed.month, d)}
        />
        <Wheel
          ariaLabel="Year of birth"
          values={yearOptions}
          selected={parsed.year}
          onChange={(y) => emit(y, parsed.month, parsed.day)}
        />
      </div>
    </div>
  );
};

export default DateOfBirthWheel;
