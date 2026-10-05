import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const ageFrom = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  return age;
};

/**
 * Users under 18 start with Precise Location OFF (privacy by default).
 * Right after their profile is created we ask once whether to turn it on.
 * Shown on web and in the iPhone/Android apps.
 */
const TeenPreciseLocationPrompt = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("birthday, privacy_settings").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        const ps = ((data as any)?.privacy_settings ?? {}) as Record<string, unknown>;
        const bday = (data as any)?.birthday as string | null;
        if (bday && ageFrom(bday) < 18 && ps.precise_prompted !== true) {
          setSettings(ps);
          setOpen(true);
        }
      });
  }, [user]);

  const choose = async (precise: boolean) => {
    if (!user) return;
    setBusy(true);
    const next = { ...settings, location_precision: precise ? "precise" : "zip", precise_prompted: true };
    const { error } = await supabase.from("profiles").update({ privacy_settings: next } as any).eq("user_id", user.id);
    setBusy(false);
    if (error) { toast.error("Couldn't save your choice"); return; }
    setOpen(false);
    toast.success(precise ? "Precise Location turned on" : "Precise Location stays off. You can change this in Settings.");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) choose(false); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <div className="mx-auto mb-2 h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-center">Turn on Precise Location?</DialogTitle>
          <DialogDescription className="text-center">
            Precise Location helps us find date spots closest to you. It's off by default for users under 18.
            Your exact location is never stored or shared with your partner, and you can change this anytime in Settings.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="h-11 w-full rounded-xl" disabled={busy} onClick={() => choose(true)}>
            Turn on Precise Location
          </Button>
          <Button variant="ghost" className="h-11 w-full rounded-xl" disabled={busy} onClick={() => choose(false)}>
            Keep it off
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeenPreciseLocationPrompt;
