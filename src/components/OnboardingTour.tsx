import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, CalendarDays, Link2, X } from "lucide-react";

const steps = [
  {
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    title: "Plan Perfect Dates",
    description: "Get AI-powered date ideas based on your budget, vibe, and location — with real Yelp ratings and reviews.",
  },
  {
    icon: <Link2 className="h-8 w-8 text-primary" />,
    title: "Link With Your Partner",
    description: "Share a partner code to connect accounts. Build a shared calendar and bucket list together.",
  },
  {
    icon: <CalendarDays className="h-8 w-8 text-primary" />,
    title: "Track & Remember",
    description: "Save dates to your shared calendar, add photos after, and rate your favorites to get even better suggestions.",
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onComplete();
  };

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="max-w-sm w-full text-center space-y-8">
        {/* Step indicator */}
        <div className="flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/40" : "w-4 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="mx-auto h-20 w-20 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
          {current.icon}
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">{current.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{current.description}</p>
        </div>

        {/* Action */}
        <Button onClick={handleNext} size="lg" className="w-full rounded-xl text-base font-semibold h-12">
          {step < steps.length - 1 ? "Next" : "Get Started"}
        </Button>
      </div>
    </div>
  );
};

export default OnboardingTour;
