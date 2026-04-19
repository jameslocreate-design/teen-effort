import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft, Shield, Lock, Download, PauseCircle, Trash2,
  EyeOff, MapPin, Eye, KeyRound, Loader2, FileText,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import jsPDF from "jspdf";

interface PrivacySettings {
  date_ideas_visibility: "partner" | "private";
  wishlists_visibility: "partner" | "private";
  location_precision: "precise" | "zip";
  ghost_mode: boolean;
}

const DEFAULT_PRIVACY: PrivacySettings = {
  date_ideas_visibility: "partner",
  wishlists_visibility: "partner",
  location_precision: "precise",
  ghost_mode: false,
};

const SettingsPage = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const [privacy, setPrivacy] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("privacy_settings")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        const ps = (data as any)?.privacy_settings;
        if (ps) setPrivacy({ ...DEFAULT_PRIVACY, ...ps });
      });
  }, [user]);

  const updatePrivacy = async (next: PrivacySettings) => {
    if (!user) return;
    setPrivacy(next);
    setSavingPrivacy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ privacy_settings: next } as any)
      .eq("user_id", user.id);
    setSavingPrivacy(false);
    if (error) toast.error("Failed to save");
    else toast.success("Privacy updated");
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      setNewPassword(""); setConfirmPassword("");
    }
  };

  const handleExportPDF = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [{ data: profile }, { data: dates }, { data: letters }] = await Promise.all([
        supabase.from("profiles").select("name").eq("user_id", user.id).single(),
        supabase.from("calendar_entries").select("*").order("date", { ascending: false }),
        supabase.from("love_letters").select("*").order("created_at", { ascending: false }),
      ]);

      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 56;
      let y = margin;

      const ensureSpace = (needed: number) => {
        if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
      };

      // Cover
      doc.setFont("helvetica", "bold"); doc.setFontSize(28);
      doc.text("Date Diary", pageW / 2, pageH / 3, { align: "center" });
      doc.setFont("helvetica", "italic"); doc.setFontSize(14);
      doc.setTextColor(120);
      doc.text(`A keepsake for ${profile?.name || "you"}`, pageW / 2, pageH / 3 + 30, { align: "center" });
      doc.setFontSize(10);
      doc.text(new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
        pageW / 2, pageH / 3 + 50, { align: "center" });
      doc.setTextColor(0);

      // Dates section
      doc.addPage(); y = margin;
      doc.setFont("helvetica", "bold"); doc.setFontSize(20);
      doc.text(`Your Dates (${dates?.length || 0})`, margin, y); y += 28;

      if (!dates || dates.length === 0) {
        doc.setFont("helvetica", "italic"); doc.setFontSize(11); doc.setTextColor(120);
        doc.text("No dates logged yet.", margin, y);
        doc.setTextColor(0);
      } else {
        for (const d of dates as any[]) {
          ensureSpace(110);
          doc.setFont("helvetica", "bold"); doc.setFontSize(13);
          const titleLines = doc.splitTextToSize(d.title || "Untitled", pageW - margin * 2);
          doc.text(titleLines, margin, y); y += titleLines.length * 16 + 2;

          doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110);
          const meta = [
            new Date(d.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
            d.event_time, d.vibe, d.estimated_cost,
            d.user_rating ? `★ ${d.user_rating}/5` : null,
            d.is_favorite ? "❤ Favorite" : null,
          ].filter(Boolean).join("  •  ");
          doc.text(meta, margin, y); y += 14;
          doc.setTextColor(0);

          if (d.description) {
            doc.setFont("helvetica", "normal"); doc.setFontSize(10);
            const descLines = doc.splitTextToSize(d.description, pageW - margin * 2);
            ensureSpace(descLines.length * 12 + 8);
            doc.text(descLines, margin, y); y += descLines.length * 12 + 4;
          }
          if (d.yelp_url) {
            doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(80, 80, 200);
            doc.textWithLink("View on Yelp →", margin, y, { url: d.yelp_url }); y += 12;
            doc.setTextColor(0);
          }
          y += 10;
          doc.setDrawColor(220); doc.line(margin, y, pageW - margin, y); y += 14;
        }
      }

      // Letters section
      if (letters && letters.length > 0) {
        doc.addPage(); y = margin;
        doc.setFont("helvetica", "bold"); doc.setFontSize(20);
        doc.text(`Love Letters (${letters.length})`, margin, y); y += 28;
        for (const l of letters as any[]) {
          const sent = l.sender_id === user.id ? "Sent" : "Received";
          ensureSpace(60);
          doc.setFont("helvetica", "bold"); doc.setFontSize(11);
          doc.text(`${sent} • ${new Date(l.created_at).toLocaleDateString()}`, margin, y); y += 16;
          doc.setFont("helvetica", "normal"); doc.setFontSize(10);
          const lines = doc.splitTextToSize(l.content, pageW - margin * 2);
          ensureSpace(lines.length * 12 + 12);
          doc.text(lines, margin, y); y += lines.length * 12 + 16;
          doc.setDrawColor(220); doc.line(margin, y, pageW - margin, y); y += 14;
        }
      }

      doc.save(`date-diary-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Date Diary downloaded!");
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    }
    setExporting(false);
  };

  const Section = ({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc?: string; children: React.ReactNode }) => (
    <section className="rounded-2xl border border-border bg-card/40 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );

  const ToggleRow = ({ label, desc, checked, onChange, disabled }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-display italic text-primary">Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5 pb-24">
        {/* Account & Security */}
        <Section icon={<Shield className="h-4 w-4" />} title="Account & Security" desc="Manage your password and account">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Change Password</label>
            <Input type="password" placeholder="New password (min 8 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-secondary/50" />
            <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-secondary/50" />
            <Button onClick={handleChangePassword} disabled={changingPw || !newPassword} className="w-full h-10 rounded-xl">
              {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Update Password
            </Button>
          </div>
        </Section>

        {/* Export */}
        <Section icon={<FileText className="h-4 w-4" />} title="Export Your Data" desc="Download a PDF Date Diary of your relationship memories">
          <Button onClick={handleExportPDF} disabled={exporting} variant="outline" className="w-full h-11 rounded-xl justify-start gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? "Generating PDF..." : "Download Date Diary (PDF)"}
          </Button>
        </Section>

        {/* Privacy */}
        <Section icon={<Lock className="h-4 w-4" />} title="Privacy" desc="Control what your partner and others can see">
          <ToggleRow
            label="Share Saved Date Ideas with Partner"
            desc="When off, only you can see your saved date ideas"
            checked={privacy.date_ideas_visibility === "partner"}
            disabled={savingPrivacy}
            onChange={(v) => updatePrivacy({ ...privacy, date_ideas_visibility: v ? "partner" : "private" })}
          />
          <ToggleRow
            label="Share Wishlists with Partner"
            desc="When off, your wishlists are hidden"
            checked={privacy.wishlists_visibility === "partner"}
            disabled={savingPrivacy}
            onChange={(v) => updatePrivacy({ ...privacy, wishlists_visibility: v ? "partner" : "private" })}
          />
          <div className="flex items-start justify-between gap-4 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Precise Location</p>
              <p className="text-xs text-muted-foreground mt-0.5">When off, recommendations use your zip code only (less accurate)</p>
            </div>
            <Switch
              checked={privacy.location_precision === "precise"}
              disabled={savingPrivacy}
              onCheckedChange={(v) => updatePrivacy({ ...privacy, location_precision: v ? "precise" : "zip" })}
            />
          </div>
          <div className="flex items-start justify-between gap-4 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground flex items-center gap-2"><EyeOff className="h-3.5 w-3.5" /> Ghost Mode</p>
              <p className="text-xs text-muted-foreground mt-0.5">Hide your name from the public Expert forum (posts will show as "Anonymous")</p>
            </div>
            <Switch
              checked={privacy.ghost_mode}
              disabled={savingPrivacy}
              onCheckedChange={(v) => updatePrivacy({ ...privacy, ghost_mode: v })}
            />
          </div>
        </Section>

        {/* Danger Zone */}
        <Section icon={<Trash2 className="h-4 w-4" />} title="Danger Zone" desc="Pause or permanently delete your account">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full h-11 rounded-xl justify-start gap-2">
                <PauseCircle className="h-4 w-4" />
                Deactivate Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your account will be paused and you'll be signed out. Your data is preserved
                  and your account will automatically reactivate the next time you sign in.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (!user) return;
                    const { error } = await supabase
                      .from("profiles")
                      .update({ deactivated_at: new Date().toISOString() } as any)
                      .eq("user_id", user.id);
                    if (error) toast.error("Failed to deactivate");
                    else {
                      toast.success("Account deactivated. Signing you out...");
                      setTimeout(() => supabase.auth.signOut(), 800);
                    }
                  }}
                >
                  Deactivate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full h-11 rounded-xl justify-start gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete Account Permanently
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Permanently delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. All your data — profile, dates, photos, letters,
                  bucket list, partner link, and everything else — will be permanently erased.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    try {
                      const { error } = await supabase.functions.invoke("delete-account");
                      if (error) throw error;
                      toast.success("Your account has been deleted.");
                      await supabase.auth.signOut();
                    } catch (e: any) {
                      toast.error(e?.message || "Failed to delete account");
                    }
                  }}
                >
                  Delete forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Section>
      </div>
    </div>
  );
};

export default SettingsPage;
