import { cn } from "@/lib/utils";
import {
  Smile, Sparkles, PartyPopper, Flame,
} from "lucide-react";

const moods = [
  { value: "playful", label: "Playful", icon: Smile, description: "Laughs & lighthearted fun" },
  { value: "fancy", label: "Fancy", icon: Sparkles, description: "Dress up & go all out" },
  { value: "social", label: "Social", icon: PartyPopper, description: "Double dates & group fun" },
  { value: "passionate", label: "Passionate", icon: Flame, description: "Intense & unforgettable" },
];

interface MoodSelectorProps {
  selected: string[] | null;
  onSelect: (mood: string[] | null) => void;
}

const MoodSelector = ({ selected, onSelect }: MoodSelectorProps) => {
  const selectedArr = selected || [];

  const toggle = (value: string) => {
    const newArr = selectedArr.includes(value)
      ? selectedArr.filter((v) => v !== value)
      : [...selectedArr, value];
    onSelect(newArr.length > 0 ? newArr : null);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground font-sans">
          How Are You Feeling?
        </h3>
        <p className="text-xs text-muted-foreground/70 font-sans">
          Pick your moods and we'll tailor your date ideas
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {moods.map((mood) => {
          const Icon = mood.icon;
          const isSelected = selectedArr.includes(mood.value);
          return (
            <button
              key={mood.value}
              onClick={() => toggle(mood.value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all duration-200 text-center",
                isSelected
                  ? "border-primary/40 bg-primary/10 text-primary glow-rose"
                  : "border-border bg-card text-secondary-foreground hover:border-primary/20 hover:bg-card/80"
              )}
            >
              <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
              <span className="text-xs font-semibold uppercase tracking-wider font-sans">{mood.label}</span>
              <span className="text-[10px] text-muted-foreground font-sans leading-tight">{mood.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MoodSelector;
