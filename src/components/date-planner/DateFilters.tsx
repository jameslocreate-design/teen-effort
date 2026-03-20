import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import FilterGroup from "@/components/FilterGroup";
import type { DateFilters as DateFiltersType } from "@/lib/date-planner";

const costOptions = [
  { value: "Free", label: "Free", icon: "🆓" },
  { value: "Budget ($1-25)", label: "$", icon: "💵" },
  { value: "Moderate ($25-75)", label: "$$", icon: "💰" },
  { value: "Splurge ($75+)", label: "$$$", icon: "💎" },
];

const locationOptions = [
  { value: "Indoor", label: "Indoor", icon: "🏠" },
  { value: "Outdoor", label: "Outdoor", icon: "🌳" },
  { value: "Both indoor and outdoor", label: "Mix", icon: "🌆" },
];

const activityOptions = [
  { value: "Adventurous & thrilling", label: "Adventure", icon: "🧗" },
  { value: "Romantic & intimate", label: "Romantic", icon: "💕" },
  { value: "Relaxed & laid-back", label: "Relaxed", icon: "☕" },
  { value: "Creative & artistic", label: "Creative", icon: "🎨" },
  { value: "Fun activity", label: "Fun Activity", icon: "🎳" },
];

const funActivityOptions = [
  { value: "Mini Golf", label: "Mini Golf", icon: "⛳" },
  { value: "Bowling", label: "Bowling", icon: "🎳" },
  { value: "Karaoke", label: "Karaoke", icon: "🎤" },
  { value: "Arcade", label: "Arcade", icon: "🕹️" },
  { value: "Go-Karts", label: "Go-Karts", icon: "🏎️" },
  { value: "Escape Room", label: "Escape Room", icon: "🔐" },
  { value: "Laser Tag", label: "Laser Tag", icon: "🔫" },
  { value: "Ice Skating", label: "Ice Skating", icon: "⛸️" },
];

const cuisineOptions = [
  { value: "Italian", label: "Italian", icon: "🍝" },
  { value: "American", label: "American", icon: "🍔" },
  { value: "Chinese", label: "Chinese", icon: "🥡" },
  { value: "Japanese", label: "Japanese", icon: "🍣" },
  { value: "Mexican", label: "Mexican", icon: "🌮" },
  { value: "Thai", label: "Thai", icon: "🍜" },
  { value: "French", label: "French", icon: "🥐" },
  { value: "Indian", label: "Indian", icon: "🍛" },
];

const distanceOptions = [
  { value: "Walking distance", label: "Walking", icon: "🚶" },
  { value: "Short drive (under 30 min)", label: "Short Drive", icon: "🚗" },
  { value: "Day trip (30-60 min drive)", label: "Day Trip", icon: "🗺️" },
  { value: "Road trip (1+ hours)", label: "Road Trip", icon: "🛣️" },
];

const timePresets = [
  { value: "1 hour", label: "1 hr", icon: "⚡" },
  { value: "2-3 hours", label: "2-3 hrs", icon: "🕐" },
  { value: "Half day (4-6 hours)", label: "Half Day", icon: "🌤️" },
  { value: "Full day", label: "Full Day", icon: "☀️" },
];

interface DateFiltersProps {
  filters: DateFiltersType;
  onFilterChange: (key: keyof DateFiltersType) => (value: string | null) => void;
}

const DateFilters = ({ filters, onFilterChange }: DateFiltersProps) => {
  return (
    <div className="space-y-8">
      <FilterGroup label="Budget" options={costOptions} selected={filters.cost} onSelect={onFilterChange("cost")} />
      <FilterGroup label="Setting" options={locationOptions} selected={filters.location} onSelect={onFilterChange("location")} variant="card" />
      <FilterGroup label="Vibe" options={activityOptions} selected={filters.activity} onSelect={onFilterChange("activity")} />
      {filters.activity === "Fun activity" && (
        <FilterGroup label="Specific Activity" options={funActivityOptions} selected={filters.funActivity} onSelect={onFilterChange("funActivity")} />
      )}
      <FilterGroup label="Cuisine" options={cuisineOptions} selected={filters.cuisine} onSelect={onFilterChange("cuisine")} />
      <FilterGroup label="Distance" options={distanceOptions} selected={filters.distance} onSelect={onFilterChange("distance")} />
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground font-sans">Time Available</h3>
        <div className="flex flex-wrap gap-2.5">
          {timePresets.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFilterChange("timeRange")(filters.timeRange === opt.value ? null : opt.value)}
              className={cn(
                "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200 font-sans",
                filters.timeRange === opt.value
                  ? "border-primary/40 bg-primary/10 text-primary glow-rose"
                  : "border-border bg-card text-secondary-foreground hover:border-primary/20 hover:bg-card/80"
              )}
            >
              <span className="text-base">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Or type custom time, e.g. '6pm - 9pm' or '3 hours'"
          value={filters.timeRange && !timePresets.some(p => p.value === filters.timeRange) ? filters.timeRange : ""}
          onChange={(e) => onFilterChange("timeRange")(e.target.value || null)}
          className="rounded-2xl border-border bg-card text-sm font-sans"
        />
      </div>
    </div>
  );
};

export default DateFilters;
