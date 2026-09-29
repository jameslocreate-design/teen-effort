import { useEffect, useMemo, useState } from "react";
import { addMonths, addYears, differenceInCalendarDays, differenceInCalendarMonths, format, parseISO } from "date-fns";
import { Heart, Loader2, Pencil, Sparkles, Link2 } from "lucide-react";
import { DEMO_LINK_ID } from "@/lib/demo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { syncTimeTogetherWidget } from "@/lib/widgetSync";

const todayISO = () => format(new Date(), "yyyy-MM-dd");

/** Calendar-accurate years/months/days between start and today (local dates). */
export function timeTogether(startISO: string, now = new Date()) {
  const start = parseISO(startISO);
  const today = parseISO(format(now, "yyyy-MM-dd"));
  let months = differenceInCalendarMonths(today, start);
  if (addMonths(start, months) > today) months -= 1;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const days = differenceInCalendarDays(today, addMonths(start, months));
  const total = differenceInCalendarDays(today, start);
  return { years, months: remMonths, days, total };
}

export function milestoneLabel(startISO: string, total: number): string | null {
  if (total <= 0) return null;
  const start = parseISO(startISO);
  const today = parseISO(todayISO());
  const yrs = Math.floor(differenceInCalendarMonths(today, start) / 12);
  if (yrs > 0 && differenceInCalendarDays(today, addYears(start, yrs)) === 0)
    return `${yrs} year${yrs > 1 ? "s" : ""} together today`;
  if (total % 100 === 0) return `${total.toLocaleString()} days together today`;
  return null;
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

const TimeTogether = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, setTick] = useState(0);

  // Demo build: the start date is kept in this browser only.
  const STORAGE_KEY = "demo-relationship-start";

  const load = async () => {
    if (!user) return;
    setLinkId(DEMO_LINK_ID);
    const stored = localStorage.getItem(STORAGE_KEY);
    setStartDate(stored || null);
    syncTimeTogetherWidget(stored || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("partner-link-changed", onChange);
    // refresh the count at midnight / when app returns to foreground
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    const vis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("partner-link-changed", onChange);
      document.removeEventListener("visibilitychange", vis);
      clearInterval(t);
    };
  }, [user?.id]);

  const stats = useMemo(() => (startDate ? timeTogether(startDate) : null), [startDate, Date.now() / 60000 | 0]);
  const milestone = startDate && stats ? milestoneLabel(startDate, stats.total) : null;

  const save = async (value: string) => {
    if (!value) return toast.error("Pick a date first");
    if (value > todayISO()) return toast.error("That date is in the future — pick today or earlier.");
    setSaving(true);
    localStorage.setItem(STORAGE_KEY, value);
    setSaving(false);
    setStartDate(value);
    syncTimeTogetherWidget(value);
    setEditing(false);
    toast.success("Saved on this device 💞");
  };

  if (loading) return <div className="rounded-xl border border-border bg-card p-4 animate-pulse"><div className="h-16" /></div>;

  if (!linkId) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary"><Link2 className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground font-sans">Time Together</p>
          <p className="text-xs text-muted-foreground font-sans">Link your partner to start counting your days together.</p>
        </div>
      </div>
    );
  }

  const dateInput = (
    <Input
      type="date"
      max={todayISO()}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      className="h-11 rounded-xl text-base"
      aria-label="Relationship start date"
    />
  );

  if (!startDate) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary"><Heart className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-semibold text-foreground font-sans">When did your story begin?</p>
            <p className="text-xs text-muted-foreground font-sans">Either of you can set it — you'll both see it.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {dateInput}
          <Button className="h-11 rounded-xl" disabled={saving} onClick={() => save(draft)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  const parts = [stats!.years && plural(stats!.years, "year"), stats!.months && plural(stats!.months, "month"), plural(stats!.days, "day")].filter(Boolean);

  return (
    <>
      <button
        type="button"
        onClick={() => { setDraft(startDate); setEditing(true); }}
        className={`w-full text-left rounded-xl border bg-card p-4 space-y-2 transition-colors ${milestone ? "border-primary/50 bg-primary/5" : "border-border"}`}
        aria-label="Edit relationship start date"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
              {milestone ? <Sparkles className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">Time Together</p>
              <p className="font-display text-lg text-foreground leading-tight">{parts.join(", ")}</p>
            </div>
          </div>
          <Pencil className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {stats!.total.toLocaleString()} days together · since {format(parseISO(startDate), "MMM d, yyyy")}
        </p>
        {milestone && <p className="text-xs text-primary font-sans">✨ {milestone}</p>}
      </button>

      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle className="font-display">When did your story begin?</SheetTitle>
            <SheetDescription>Changing this updates it for both of you.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {dateInput}
            <Button className="w-full h-11 rounded-xl" disabled={saving} onClick={() => save(draft)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save date"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default TimeTogether;
