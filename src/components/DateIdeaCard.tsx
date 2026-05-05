import type { DateIdea } from "@/lib/date-planner";
import { Clock, DollarSign, Sparkles, MapPin, Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DateIdeaCardProps {
  idea: DateIdea;
  index: number;
}

const vibeColors: Record<string, string> = {
  Romantic: "bg-pink-500/15 text-pink-400",
  Adventurous: "bg-orange-500/15 text-orange-400",
  Cozy: "bg-amber-500/15 text-amber-400",
  Creative: "bg-violet-500/15 text-violet-400",
  Relaxed: "bg-sky-500/15 text-sky-400",
  Fun: "bg-emerald-500/15 text-emerald-400",
};

const DateIdeaCard = ({ idea, index }: DateIdeaCardProps) => {
  const vibeClass = vibeColors[idea.vibe] || "bg-primary/15 text-primary";

  return (
    <div
      className="group rounded-2xl border border-border bg-card p-5 space-y-3 transition-all duration-300 hover:border-primary/30 hover:glow-sm"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground leading-snug">{idea.title}</h3>
          {idea.rating && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="text-sm font-medium">{idea.rating}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                ({idea.review_count} reviews)
              </span>
            </div>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${vibeClass}`}>
          {idea.vibe}
        </span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{idea.description}</p>

      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-primary/70" />
            {idea.estimated_cost}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary/70" />
            {idea.duration}
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary/70" />
            {idea.vibe}
          </span>
          {idea.distance_miles && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary/70" />
              {idea.distance_miles}
            </span>
          )}
        </div>
        {idea.url && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => window.open(idea.url, "_blank")}
          >
            View venue
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default DateIdeaCard;
