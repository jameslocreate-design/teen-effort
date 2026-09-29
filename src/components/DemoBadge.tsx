import { FlaskConical } from "lucide-react";
import { DEMO_FOOTER_NOTE } from "@/lib/demo";

/** Small pill shown on every screen so testers always know this is a demo. */
const DemoBadge = ({ className = "" }: { className?: string }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary ${className}`}
  >
    <FlaskConical className="h-3 w-3" /> Demo build
  </span>
);

export const DemoFooterNote = ({ className = "" }: { className?: string }) => (
  <p className={`text-[11px] text-muted-foreground text-center leading-relaxed ${className}`}>
    {DEMO_FOOTER_NOTE}
  </p>
);

export default DemoBadge;
