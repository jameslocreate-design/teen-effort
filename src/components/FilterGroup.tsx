import { cn } from "@/lib/utils";

interface FilterGroupProps {
  label: string;
  options: { value: string; label: string; icon: string }[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}

const FilterGroup = ({ label, options, selected, onSelect }: FilterGroupProps) => {
  return (
    <div className="space-y-2.5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(selected === opt.value ? null : opt.value)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
              selected === opt.value
                ? "border-primary/50 bg-primary/15 text-primary glow-sm"
                : "border-border bg-secondary/40 text-secondary-foreground hover:border-primary/30 hover:bg-secondary/70"
            )}
          >
            <span className="text-base">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FilterGroup;
