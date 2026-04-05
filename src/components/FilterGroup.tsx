import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface FilterGroupProps {
  label: string;
  options: { value: string; label: string; icon: LucideIcon }[];
  selected: string | string[] | null;
  onSelect: (value: string | string[] | null) => void;
  variant?: "pill" | "card" | "cuisine";
  multi?: boolean;
}

const FilterGroup = ({ label, options, selected, onSelect, variant = "pill", multi = false }: FilterGroupProps) => {
  const selectedArr = Array.isArray(selected) ? selected : selected ? [selected] : [];

  const handleClick = (value: string) => {
    if (multi) {
      const newArr = selectedArr.includes(value)
        ? selectedArr.filter((v) => v !== value)
        : [...selectedArr, value];
      onSelect(newArr.length > 0 ? newArr : null);
    } else {
      onSelect(selectedArr.includes(value) ? null : value);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground font-sans">{label}</h3>
      <div className={cn(
        "flex flex-wrap gap-2.5",
        variant === "card" && "grid grid-cols-3 gap-3",
        variant === "cuisine" && "grid grid-cols-2 gap-3"
      )}>
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selectedArr.includes(opt.value);

          if (variant === "card") {
            return (
              <button
                key={opt.value}
                onClick={() => handleClick(opt.value)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2.5 rounded-2xl border p-5 text-sm font-medium transition-all duration-200 font-sans",
                  isSelected
                    ? "border-primary/40 bg-primary/8 text-primary glow-rose"
                    : "border-border bg-card hover:border-primary/20 hover:bg-card/80 text-secondary-foreground"
                )}
              >
                <Icon className={cn("h-6 w-6", isSelected ? "text-primary" : "text-muted-foreground")} />
                <span className="text-xs uppercase tracking-wider">{opt.label}</span>
              </button>
            );
          }

          if (variant === "cuisine") {
            return (
              <button
                key={opt.value}
                onClick={() => handleClick(opt.value)}
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-4 py-3.5 text-sm font-medium transition-all duration-200 font-sans",
                  isSelected
                    ? "border-primary/40 bg-primary/10 text-primary glow-rose"
                    : "border-border bg-card text-secondary-foreground hover:border-primary/20 hover:bg-card/80"
                )}
              >
                <span className="text-xs uppercase tracking-wider">{opt.label}</span>
                <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground/50")} />
              </button>
            );
          }

          return (
            <button
              key={opt.value}
              onClick={() => handleClick(opt.value)}
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
    </div>
  );
};

export default FilterGroup;
