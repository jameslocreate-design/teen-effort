import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { preparationTasks, readPreparation, savePreparation, type PlannedDate, type PreparationSettings } from "@/lib/date-preparation";

export default function DatePreparation({ date }: { date: PlannedDate }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(() => user ? readPreparation(user.id, date.id) : readPreparation("", date.id));
  if (!user) return null;
  const update = (patch: Partial<PreparationSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    savePreparation(user.id, date.id, next);
  };
  return <section className="space-y-3 border-t border-border pt-4">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><ClipboardCheck className="h-4 w-4 text-primary" />Get ready for your date</h3>
    <div className="grid grid-cols-3 gap-2">
      {([['readyMinutes', 'Getting ready'], ['travelMinutes', 'Travel estimate'], ['bufferMinutes', 'Arrive early']] as const).map(([field, label]) => <label key={field} className="space-y-1 text-xs text-muted-foreground">
        <span>{label} (min)</span><Input aria-label={`${label} minutes`} type="number" min={0} max={240} value={settings[field]} className="h-11 text-base" onChange={event => update({ [field]: Math.max(0, Math.min(240, Number(event.target.value) || 0)) })} />
      </label>)}
    </div>
    {!date.event_time && <p className="text-xs text-muted-foreground">A date time is needed to calculate your schedule.</p>}
    <ul className="space-y-1">{preparationTasks(date, settings).map(task => <li key={task.id}>
      <label className="flex min-h-11 items-center gap-3 text-sm text-foreground">
        <Checkbox checked={task.completed} onCheckedChange={checked => update({ completed: checked ? [...settings.completed, task.id] : settings.completed.filter(id => id !== task.id) })} />
        <span className={`min-w-0 flex-1 ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.label}</span>
        {task.at && <time className="shrink-0 text-xs text-muted-foreground" dateTime={task.at}>{format(new Date(task.at), "MMM d, h:mm a")}</time>}
      </label>
    </li>)}</ul>
  </section>;
}