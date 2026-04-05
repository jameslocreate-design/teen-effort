import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import FilterGroup from "@/components/FilterGroup";
import type { DateFilters as DateFiltersType } from "@/lib/date-planner";
import {
  CircleDollarSign, Banknote, Wallet, Gem,
  Home, TreePine, Building2,
  Mountain, Heart, Coffee, Palette, PartyPopper,
  Target, Disc3, Mic, Gamepad2, Flag, Lock, Crosshair, Snowflake,
  UtensilsCrossed, Beef, Soup, Fish, Salad, CookingPot, Croissant, Flame,
  Footprints, Car, Map, Route,
  Zap, Clock, Sun, SunMedium, Plus, X
} from "lucide-react";

const costOptions = [
  { value: "Free", label: "Free", icon: CircleDollarSign },
  { value: "Budget ($1-25)", label: "$", icon: Banknote },
  { value: "Moderate ($25-75)", label: "$$", icon: Wallet },
  { value: "Splurge ($75+)", label: "$$$", icon: Gem },
];

const locationOptions = [
  { value: "Indoor", label: "Indoor", icon: Home },
  { value: "Outdoor", label: "Outdoor", icon: TreePine },
  { value: "Both indoor and outdoor", label: "Mix", icon: Building2 },
];

const activityOptions = [
  { value: "Adventurous & thrilling", label: "Adventure", icon: Mountain },
  { value: "Romantic & intimate", label: "Romantic", icon: Heart },
  { value: "Relaxed & laid-back", label: "Relaxed", icon: Coffee },
  { value: "Creative & artistic", label: "Creative", icon: Palette },
  { value: "Fun activity", label: "Fun Activity", icon: PartyPopper },
  { value: "Eating out", label: "Eating Out", icon: UtensilsCrossed },
];

const funActivityOptions = [
  { value: "Mini Golf", label: "Mini Golf", icon: Target },
  { value: "Bowling", label: "Bowling", icon: Disc3 },
  { value: "Karaoke", label: "Karaoke", icon: Mic },
  { value: "Arcade", label: "Arcade", icon: Gamepad2 },
  { value: "Go-Karts", label: "Go-Karts", icon: Flag },
  { value: "Escape Room", label: "Escape Room", icon: Lock },
  { value: "Laser Tag", label: "Laser Tag", icon: Crosshair },
  { value: "Ice Skating", label: "Ice Skating", icon: Snowflake },
];

const cuisineOptions = [
  { value: "Italian", label: "Italian", icon: UtensilsCrossed },
  { value: "American", label: "American", icon: Beef },
  { value: "Chinese", label: "Chinese", icon: Soup },
  { value: "Japanese", label: "Japanese", icon: Fish },
  { value: "Mexican", label: "Mexican", icon: Salad },
  { value: "Thai", label: "Thai", icon: CookingPot },
  { value: "French", label: "French", icon: Croissant },
  { value: "Indian", label: "Indian", icon: Flame },
];

const distanceOptions = [
  { value: "Walking distance", label: "Walking", icon: Footprints },
  { value: "Short drive (under 30 min)", label: "Short Drive", icon: Car },
  { value: "Day trip (30-60 min drive)", label: "Day Trip", icon: Map },
  { value: "Road trip (1+ hours)", label: "Road Trip", icon: Route },
];

const timePresets = [
  { value: "1 hour", label: "1 hr", icon: Zap },
  { value: "2-3 hours", label: "2-3 hrs", icon: Clock },
  { value: "Half day (4-6 hours)", label: "Half Day", icon: SunMedium },
  { value: "Full day", label: "Full Day", icon: Sun },
];

interface DateFiltersProps {
  filters: DateFiltersType;
  onFilterChange: (key: keyof DateFiltersType) => (value: string | string[] | null) => void;
}

const DateFilters = ({ filters, onFilterChange }: DateFiltersProps) => {
  const activityArr = filters.activity || [];
  const showFunActivities = activityArr.includes("Fun activity");
  const showCuisine = activityArr.includes("Eating out");

  return (
    <div className="space-y-8">
      <FilterGroup label="Budget Range" options={costOptions} selected={filters.cost} onSelect={onFilterChange("cost")} multi />
      <FilterGroup label="Environment" options={locationOptions} selected={filters.location} onSelect={onFilterChange("location")} variant="card" multi />
      <FilterGroup label="The Vibe" options={activityOptions} selected={filters.activity} onSelect={onFilterChange("activity")} multi />
      {showFunActivities && (
        <div className="space-y-3">
          <FilterGroup label="Specific Activity" options={funActivityOptions} selected={filters.funActivity} onSelect={onFilterChange("funActivity")} multi />
          <CustomActivityInput
            funActivity={filters.funActivity}
            onUpdate={onFilterChange("funActivity")}
          />
        </div>
      )}
      {showCuisine && (
        <FilterGroup label="Cuisine Palette" options={cuisineOptions} selected={filters.cuisine} onSelect={onFilterChange("cuisine")} variant="cuisine" multi />
      )}
      <FilterGroup label="Distance" options={distanceOptions} selected={filters.distance} onSelect={onFilterChange("distance")} multi />
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground font-sans">Time Available</h3>
        <div className="flex flex-wrap gap-2.5">
          {timePresets.map((opt) => {
            const Icon = opt.icon;
            const isSelected = filters.timeRange === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onFilterChange("timeRange")(isSelected ? null : opt.value)}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200 font-sans",
                  isSelected
                    ? "border-primary/40 bg-primary/10 text-primary glow-rose"
                    : "border-border bg-card text-secondary-foreground hover:border-primary/20 hover:bg-card/80"
                )}
              >
                <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                <span className="text-xs uppercase tracking-wider">{opt.label}</span>
              </button>
            );
          })}
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
