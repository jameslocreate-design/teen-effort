import { Sparkles, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import DateIdeaCard from "@/components/DateIdeaCard";
import type { DateIdea } from "@/lib/date-planner";

interface DateResultsProps {
  ideas: DateIdea[];
  partnerLinkId: string | null;
  savingIndex: number | null;
  onAddToCalendar: (idea: DateIdea, index: number) => void;
  onGenerateMore: () => void;
}

const DateResults = ({ ideas, partnerLinkId, savingIndex, onAddToCalendar, onGenerateMore }: DateResultsProps) => {
  if (ideas.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">No ideas generated. Try different filters.</p>;
  }

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Your Date Ideas
      </h2>
      {ideas.map((idea, i) => (
        <div key={i} className="relative">
          <DateIdeaCard idea={idea} index={i} />
          {partnerLinkId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddToCalendar(idea, i)}
              disabled={savingIndex === i}
              className="absolute top-3 right-3 rounded-lg text-xs"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              {savingIndex === i ? "Saving..." : "Add to Calendar"}
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" onClick={onGenerateMore} className="w-full rounded-xl">
        <Sparkles className="h-4 w-4" />
        Generate More
      </Button>
    </div>
  );
};

export default DateResults;
