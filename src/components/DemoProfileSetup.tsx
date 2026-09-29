import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Heart, Sparkles } from "lucide-react";
import { saveDemoProfile, getDemoProfile, DEMO_FOOTER_NOTE } from "@/lib/demo";
import DemoBadge from "@/components/DemoBadge";

const loveLanguageOptions = [
  { value: "Words of Affirmation", emoji: "💬" },
  { value: "Acts of Service", emoji: "🤝" },
  { value: "Receiving Gifts", emoji: "🎁" },
  { value: "Quality Time", emoji: "⏰" },
  { value: "Physical Touch", emoji: "🫂" },
];

const descriptorOptions = [
  "🎮 Gamer", "🏋️ Jock", "🛍️ Shopper", "📱 Influencer",
  "📚 Bookworm", "🎨 Creative", "🍳 Foodie", "🌍 Traveler",
  "🎵 Music Lover", "🧘 Wellness", "🎬 Movie Buff", "🐾 Pet Parent",
];

const genderOptions = ["Female", "Male", "Non-binary", "Prefer not to say"];

const currentYear = new Date().getFullYear();
const birthYears = Array.from({ length: 70 }, (_, i) => currentYear - 13 - i);

/** Demo build: replaces sign-up/login. Everything stays in this browser. */
const DemoProfileSetup = ({ onComplete }: { onComplete: () => void }) => {
  const existing = getDemoProfile();
  const [name, setName] = useState(existing?.name ?? "");
  const [partnerName, setPartnerName] = useState(existing?.partnerName ?? "");
  const [birthYear, setBirthYear] = useState<number | "">(existing?.birthYear ?? "");
  const [gender, setGender] = useState<string | null>(existing?.gender ?? null);
  const [descriptors, setDescriptors] = useState<string[]>(existing?.descriptors ?? []);
  const [loveLanguages, setLoveLanguages] = useState<string[]>(existing?.loveLanguages ?? []);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const save = () => {
    if (!name.trim()) {
      toast.error("Please enter your first name");
      return;
    }
    if (!birthYear) {
      toast.error("Please choose your birth year");
      return;
    }
    saveDemoProfile({
      name: name.trim(),
      birthYear: Number(birthYear),
      gender,
      descriptors,
      loveLanguages,
      partnerName: partnerName.trim(),
    });
    toast.success("Profile saved on this device");
    onComplete();
  };

  const chip = (active: boolean) =>
    `px-3 py-2 rounded-xl text-sm border transition-all min-h-[44px] ${
      active
        ? "border-primary bg-primary/12 text-primary"
        : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      <div className="mx-auto max-w-md px-4 py-10 space-y-7 pb-16">
        <div className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/12 flex items-center justify-center">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-display italic text-primary">Create your profile</h1>
          <DemoBadge className="mx-auto" />
          <p className="text-sm text-muted-foreground">
            No account, no email, no password. Everything you enter stays in this browser.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Your first name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex"
            className="bg-secondary/50 text-base"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Birth year
          </label>
          <select
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value ? Number(e.target.value) : "")}
            className="w-full h-12 rounded-md border border-border bg-secondary/50 px-3 text-base text-foreground"
          >
            <option value="">Select a year</option>
            {birthYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Partner's first name (optional)
          </label>
          <Input
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            placeholder="Riley"
            className="bg-secondary/50 text-base"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            You are
          </label>
          <div className="flex flex-wrap gap-2">
            {genderOptions.map((g) => (
              <button key={g} type="button" onClick={() => setGender(g)} className={chip(gender === g)}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            What describes you?
          </label>
          <div className="flex flex-wrap gap-2">
            {descriptorOptions.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggle(descriptors, setDescriptors, d)}
                className={chip(descriptors.includes(d))}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Love languages
          </label>
          <div className="flex flex-wrap gap-2">
            {loveLanguageOptions.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => toggle(loveLanguages, setLoveLanguages, l.value)}
                className={chip(loveLanguages.includes(l.value))}
              >
                {l.emoji} {l.value}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={save} className="w-full h-12 rounded-xl gap-2 text-base">
          <Sparkles className="h-4 w-4" /> Start exploring
        </Button>

        <p className="text-[11px] text-center text-muted-foreground leading-relaxed">{DEMO_FOOTER_NOTE}</p>
      </div>
    </div>
  );
};

export default DemoProfileSetup;
