import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FlaskConical, RotateCcw, ScrollText, FileText, Eye, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ReactMarkdown from "react-markdown";
import privacyMd from "@/content/privacy.md?raw";
import { toast } from "sonner";
import { getDemoTier, setDemoTier, resetDemoData, demoAiRemaining, DEMO_DAILY_AI_LIMIT } from "@/lib/demo";
import DemoBadge, { DemoFooterNote } from "@/components/DemoBadge";

const tierOptions = [
  { level: 0, name: "Free", note: "Limited features, as a new user sees it" },
  { level: 1, name: "Spark", note: "Unlimited date ideas" },
  { level: 2, name: "Romance", note: "Adds gift ideas, roulette, recommendations" },
  { level: 3, name: "Soulmate", note: "Everything unlocked" },
];

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

const DemoSettingsPage = ({ onBack, onEditProfile }: { onBack: () => void; onEditProfile?: () => void }) => {
  const navigate = useNavigate();
  const [tier, setTier] = useState(getDemoTier());

  const pickTier = (level: number) => {
    setDemoTier(level);
    setTier(level);
    toast.success(`Now testing as ${tierOptions[level].name}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-display italic text-primary">Settings</h1>
          <DemoBadge className="ml-auto" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5 pb-24">
        <Section
          icon={<FlaskConical className="h-4 w-4" />}
          title="Demo tier"
          desc="Switch plans instantly — no payment runs in this build"
        >
          <div className="grid gap-2">
            {tierOptions.map((t) => (
              <button
                key={t.level}
                onClick={() => pickTier(t.level)}
                className={`w-full text-left rounded-xl border px-4 py-3 min-h-[56px] transition-all ${
                  tier === t.level
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/40 hover:bg-secondary/60"
                }`}
              >
                <p className={`text-sm font-semibold ${tier === t.level ? "text-primary" : "text-foreground"}`}>
                  {t.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.note}</p>
              </button>
            ))}
          </div>
        </Section>

        <Section icon={<User className="h-4 w-4" />} title="Your profile" desc="Saved only in this browser">
          {onEditProfile && (
            <Button variant="outline" className="w-full h-11 rounded-xl justify-start gap-2" onClick={onEditProfile}>
              <User className="h-4 w-4" /> Edit profile
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            {demoAiRemaining()} of {DEMO_DAILY_AI_LIMIT} idea generations left today on this device.
          </p>
        </Section>

        <Section icon={<ScrollText className="h-4 w-4" />} title="Privacy Policy" desc="What the app collects and why">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full h-11 rounded-xl justify-start gap-2">
                <Eye className="h-4 w-4" /> Read Privacy Policy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] p-0">
              <DialogHeader className="px-6 pt-6 pb-2">
                <DialogTitle className="font-display italic text-primary text-2xl">Privacy Policy</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] px-6 pb-6">
                <ReactMarkdown
                  components={{
                    h1: () => null,
                    h2: ({ node, ...props }) => <h2 className="font-display text-xl font-semibold text-foreground mt-7 mb-3" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="font-semibold text-foreground mt-5 mb-2" {...props} />,
                    p: ({ node, ...props }) => <p className="text-sm text-foreground/90 leading-relaxed mb-3" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1.5 text-sm text-foreground/90" {...props} />,
                    li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                    a: ({ node, ...props }) => <a className="text-primary underline underline-offset-2 break-words" target="_blank" rel="noopener noreferrer" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                  }}
                >
                  {privacyMd}
                </ReactMarkdown>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </Section>

        <Section icon={<FileText className="h-4 w-4" />} title="Terms & Conditions" desc="Rules for using the app">
          <Button variant="outline" className="w-full h-11 rounded-xl justify-start gap-2" onClick={() => navigate("/terms")}>
            <Eye className="h-4 w-4" /> Read Terms & Conditions
          </Button>
        </Section>

        <Section icon={<RotateCcw className="h-4 w-4" />} title="Reset profile" desc="Clears everything stored on this device">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full h-11 rounded-xl justify-start gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                <RotateCcw className="h-4 w-4" /> Reset profile
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset this demo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your name, preferences, saved items and demo tier will be cleared from this
                  browser, and you'll start again at the profile screen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    resetDemoData();
                    window.location.href = "/";
                  }}
                >
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Section>

        <DemoFooterNote />
      </div>
    </div>
  );
};

export default DemoSettingsPage;
