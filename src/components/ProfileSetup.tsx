import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { User, Save } from "lucide-react";

const loveLanguageOptions = [
  { value: "Words of Affirmation", emoji: "💬" },
  { value: "Acts of Service", emoji: "🤝" },
  { value: "Receiving Gifts", emoji: "🎁" },
  { value: "Quality Time", emoji: "⏰" },
  { value: "Physical Touch", emoji: "🫂" },
];

const ProfileSetup = ({ onComplete }: { onComplete: () => void }) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [descriptors, setDescriptors] = useState<string[]>([]);
  const [loveLanguage, setLoveLanguage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const descriptorOptions = [
    "🎮 Gamer", "🏋️ Jock", "🛍️ Shopper", "📱 Influencer",
    "📚 Bookworm", "🎨 Creative", "🍳 Foodie", "🌍 Traveler",
    "🎵 Music Lover", "🧘 Wellness", "🎬 Movie Buff", "🐾 Pet Parent",
  ];

  const toggleDescriptor = (d: string) => {
    setDescriptors((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name, birthday, gender, descriptors, love_language")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          if (data.name) setName(data.name);
          if (data.birthday) setBirthday(data.birthday);
          if (data.gender) setGender(data.gender);
          if ((data as any).descriptors) setDescriptors((data as any).descriptors);
          if ((data as any).love_language) setLoveLanguage((data as any).love_language);
        }
      });
  }, [user]);

  const genderOptions = ["Male", "Female", "Non-binary", "Prefer not to say"];

  const handleSave = async () => {
    if (!user || !name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        birthday: birthday || null,
        gender,
        descriptors,
        love_language: loveLanguage,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile saved!");
      if (onComplete) onComplete();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
            <User className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set Up Your Profile</h1>
          <p className="text-sm text-muted-foreground">Tell us a bit about yourself</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-secondary/50 border-border"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">Birthday</label>
            <Input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              placeholder="Your birthday"
              className="bg-secondary/50 border-border"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">Gender</label>
            <div className="flex flex-wrap gap-2">
              {genderOptions.map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(gender === g ? null : g)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                    gender === g
                      ? "border-primary/50 bg-primary/15 text-primary glow-sm"
                      : "border-border bg-secondary/40 text-secondary-foreground hover:border-primary/30"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">
              Descriptors <span className="normal-case font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {descriptorOptions.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDescriptor(d)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                    descriptors.includes(d)
                      ? "border-primary/50 bg-primary/15 text-primary glow-sm"
                      : "border-border bg-secondary/40 text-secondary-foreground hover:border-primary/30"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full h-11 rounded-xl mt-2">
            <Save className="h-4 w-4" />
            {loading ? "Saving..." : "Save & Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
