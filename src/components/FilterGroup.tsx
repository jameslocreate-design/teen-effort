import { cn } from "@/lib/utils";

interface FilterGroupProps {
  label: string;
  options: { value: string; label: string; icon: string }[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  variant?: "pill" | "card";
}

const FilterGroup = ({ label, options, selected, onSelect, variant = "pill" }: FilterGroupProps) => {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground font-sans">{label}</h3>
      <div className={cn(
        "flex flex-wrap gap-2.5",
        variant === "card" && "grid grid-cols-2 gap-3"
      )}>
        {options.map((opt) => (
          variant === "card" ? (
            <button
              key={opt.value}
              onClick={() => onSelect(selected === opt.value ? null : opt.value)}
              className={cn(
                "flex flex-col items-center justify-center gap-2.5 rounded-2xl border p-5 text-sm font-medium transition-all duration-200 font-sans",
                selected === opt.value
                  ? "border-primary/40 bg-primary/8 text-primary glow-rose"
                  : "border-border bg-card hover:border-primary/20 hover:bg-card/80 text-secondary-foreground"
              )}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-xs uppercase tracking-wider">{opt.label}</span>
            </button>
          ) : (
            <button
              key={opt.value}
              onClick={() => onSelect(selected === opt.value ? null : opt.value)}
              className={cn(
                "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200 font-sans",
                selected === opt.value
                  ? "border-primary/40 bg-primary/10 text-primary glow-rose"
                  : "border-border bg-card text-secondary-foreground hover:border-primary/20 hover:bg-card/80"
              )}
            >
              <span className="text-base">{opt.icon}</span>
              {opt.label}
            </button>
          )
        ))}
      </div>
    </div>
  );
};

export default FilterGroup;
