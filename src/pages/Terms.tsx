import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import termsText from "@/content/terms.txt?raw";

export default function Terms() {
  const navigate = useNavigate();

  // Split into paragraphs on blank lines; preserve internal line breaks.
  const paragraphs = termsText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 pb-24">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Please read these terms carefully before using the Services.
        </p>

        <article className="space-y-4 text-sm md:text-base leading-relaxed text-foreground/90 font-sans">
          {paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </article>
      </div>
    </div>
  );
}
