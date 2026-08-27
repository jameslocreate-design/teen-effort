import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Clock } from "lucide-react";

const ExpertComingSoon = () => (
  <Card className="border-border/60 bg-card/60 backdrop-blur">
    <CardContent className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <MessageCircle className="h-8 w-8 text-primary" />
        </div>
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-background ring-1 ring-border">
          <Clock className="h-4 w-4 text-muted-foreground" />
        </span>
      </div>

      <div className="space-y-2">
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
          Coming soon
        </span>
        <h2 className="font-display text-2xl italic text-foreground">Ask the Expert</h2>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          We're building a safe, moderated space to get relationship advice. It'll be back
          soon with proper safeguards in place.
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Need help now? Visit our{" "}
        <a href="/support" className="text-primary underline underline-offset-2">
          support page
        </a>
        .
      </p>
    </CardContent>
  </Card>
);

export default ExpertComingSoon;
