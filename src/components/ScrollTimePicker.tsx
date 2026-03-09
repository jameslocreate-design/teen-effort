import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollTimePickerProps {
  value: string;
  onChange: (time: string) => void;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3;

const hours = Array.from({ length: 12 }, (_, i) => i + 1);
const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
const periods = ["AM", "PM"];

function WheelColumn({
  items,
  selected,
  onSelect,
  formatItem,
}: {
  items: (string | number)[];
  selected: number;
  onSelect: (index: number) => void;
  formatItem?: (item: string | number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    if (ref.current && !isScrolling.current) {
      ref.current.scrollTop = selected * ITEM_HEIGHT;
    }
  }, [selected]);

  const handleScroll = () => {
    if (!ref.current) return;
    isScrolling.current = true;
    const index = Math.round(ref.current.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    if (clamped !== selected) onSelect(clamped);

    clearTimeout((ref.current as any)._scrollTimer);
    (ref.current as any)._scrollTimer = setTimeout(() => {
      if (ref.current) {
        ref.current.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: "smooth" });
      }
      isScrolling.current = false;
    }, 100);
  };

  return (
    <div className="relative h-[120px] w-16 overflow-hidden">
      {/* Selection highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-[40px] h-[40px] rounded-lg bg-primary/10 border border-primary/20 z-10" />
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[40px] bg-gradient-to-b from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40px] bg-gradient-to-t from-background to-transparent z-10" />

      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll scrollbar-none snap-y snap-mandatory"
        style={{ paddingTop: ITEM_HEIGHT, paddingBottom: ITEM_HEIGHT }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => {
              onSelect(i);
              ref.current?.scrollTo({ top: i * ITEM_HEIGHT, behavior: "smooth" });
            }}
            className={cn(
              "flex items-center justify-center w-full snap-center transition-all duration-150",
              i === selected
                ? "text-foreground font-semibold text-lg"
                : "text-muted-foreground text-base"
            )}
            style={{ height: ITEM_HEIGHT }}
          >
            {formatItem ? formatItem(item) : String(item)}
          </button>
        ))}
      </div>
    </div>
  );
}

const ScrollTimePicker = ({ value, onChange }: ScrollTimePickerProps) => {
  const parseTime = (t: string) => {
    if (!t) return { hour: 0, minute: 0, period: 0 };
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? 1 : 0;
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const minuteIndex = Math.round(m / 5);
    return {
      hour: hours.indexOf(hour12),
      minute: Math.min(minuteIndex, 11),
      period,
    };
  };

  const initial = parseTime(value);
  const [hourIdx, setHourIdx] = useState(initial.hour >= 0 ? initial.hour : 0);
  const [minuteIdx, setMinuteIdx] = useState(initial.minute);
  const [periodIdx, setPeriodIdx] = useState(initial.period);

  const emit = (h: number, m: number, p: number) => {
    let hour24 = hours[h];
    if (periods[p] === "AM" && hour24 === 12) hour24 = 0;
    else if (periods[p] === "PM" && hour24 !== 12) hour24 += 12;
    const timeStr = `${String(hour24).padStart(2, "0")}:${String(minutes[m]).padStart(2, "0")}`;
    onChange(timeStr);
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <WheelColumn
        items={hours}
        selected={hourIdx}
        onSelect={(i) => { setHourIdx(i); emit(i, minuteIdx, periodIdx); }}
      />
      <span className="text-lg font-bold text-foreground">:</span>
      <WheelColumn
        items={minutes}
        selected={minuteIdx}
        onSelect={(i) => { setMinuteIdx(i); emit(hourIdx, i, periodIdx); }}
        formatItem={(item) => String(item).padStart(2, "0")}
      />
      <WheelColumn
        items={periods}
        selected={periodIdx}
        onSelect={(i) => { setPeriodIdx(i); emit(hourIdx, minuteIdx, i); }}
      />
    </div>
  );
};

export default ScrollTimePicker;
