import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { User, Save, Camera } from "lucide-react";

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
  const [loveLanguages, setLoveLanguages] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      .select("name, birthday, gender, descriptors, love_language, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          if (data.name) setName(data.name);
          if (data.birthday) setBirthday(data.birthday);
          else if ((user as any).user_metadata?.birthday) {
            // Prefill from signup age-gate DOB if profile hasn't set one yet
            setBirthday((user as any).user_metadata.birthday);
          }
          if (data.gender) setGender(data.gender);
          if ((data as any).descriptors) setDescriptors((data as any).descriptors);
          if ((data as any).love_language) {
            const ll = (data as any).love_language;
            setLoveLanguages(Array.isArray(ll) ? ll : ll ? [ll] : []);
          }
          if ((data as any).avatar_url) setAvatarUrl((data as any).avatar_url);
        }
      });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload photo");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl } as any)
      .eq("user_id", user.id);

    if (updateError) {
      toast.error("Failed to save avatar");
    } else {
      setAvatarUrl(publicUrl);
      toast.success("Profile photo updated!");
      window.dispatchEvent(new Event("profile-updated"));
    }
    setUploading(false);
  };

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
        love_language: loveLanguages.length > 0 ? loveLanguages.join(", ") : null,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile saved!");
      window.dispatchEvent(new Event("profile-updated"));
      if (onComplete) onComplete();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          {/* Avatar upload */}
          <div className="relative mx-auto w-fit">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="relative h-20 w-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden ring-2 ring-primary/20 hover:ring-primary/40 transition-all group"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-foreground" />
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <p className="text-[10px] text-muted-foreground mt-2">Tap to add photo</p>
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

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">
              Love Languages <span className="normal-case font-normal">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {loveLanguageOptions.map((ll) => {
                const isSelected = loveLanguages.includes(ll.value);
                return (
                  <button
                    key={ll.value}
                    onClick={() => setLoveLanguages(prev => 
                      prev.includes(ll.value) ? prev.filter(v => v !== ll.value) : [...prev, ll.value]
                    )}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                      isSelected
                        ? "border-primary/50 bg-primary/15 text-primary glow-sm"
                        : "border-border bg-secondary/40 text-secondary-foreground hover:border-primary/30"
                    }`}
                  >
                    {ll.emoji} {ll.value}
                  </button>
                );
              })}
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
