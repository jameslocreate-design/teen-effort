import type { GiftIdea } from "@/lib/gift-planner";
import { DollarSign, ShoppingBag, Sparkles, Lightbulb, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GiftIdeaCardProps {
  idea: GiftIdea;
  index: number;
}

const vibeColors: Record<string, string> = {
  Sentimental: "bg-pink-500/15 text-pink-400",
  Playful: "bg-orange-500/15 text-orange-400",
  Luxurious: "bg-amber-500/15 text-amber-400",
  Creative: "bg-violet-500/15 text-violet-400",
  Practical: "bg-sky-500/15 text-sky-400",
  Romantic: "bg-rose-500/15 text-rose-400",
};

const GiftIdeaCard = ({ idea, index }: GiftIdeaCardProps) => {
  const vibeClass = vibeColors[idea.vibe] || "bg-primary/15 text-primary";

  return (
    <div
      className="group rounded-2xl border border-border bg-card p-5 space-y-3 transition-all duration-300 hover:border-primary/30 hover:glow-sm"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground leading-snug">{idea.title}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${vibeClass}`}>
          {idea.vibe}
        </span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{idea.description}</p>

      {idea.personalization_tip && (
        <div className="flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2.5">
          <Lightbulb className="h-3.5 w-3.5 text-primary/70 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">{idea.personalization_tip}</p>
        </div>
      )}

      <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-primary/70" />
          {idea.estimated_cost}
        </span>
        <span className="flex items-center gap-1.5">
          <ShoppingBag className="h-3.5 w-3.5 text-primary/70" />
          {idea.where_to_buy}
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary/70" />
          {idea.vibe}
        </span>
      </div>
    </div>
  );
};

export default GiftIdeaCard;
