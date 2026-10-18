import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublicHome() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <nav className="max-w-5xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-4" aria-label="Main navigation">
          <Link to="/" className="font-display text-xl text-primary">Teen Effort</Link>
          <div className="flex items-center gap-5 text-sm">
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link to="/support" className="text-muted-foreground hover:text-foreground">Support</Link>
            <Button asChild variant="outline"><Link to="/app">Open app <ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
          </div>
        </nav>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-16 text-center flex flex-col items-center justify-center gap-6">
        <img src="/pwa-192.png" alt="Teen Effort" width="96" height="96" className="rounded-lg" />
        <h1 className="font-display text-4xl sm:text-5xl font-bold">Teen Effort</h1>
        <p className="text-lg text-muted-foreground max-w-md">Make time for each other.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild className="min-h-11"><Link to="/app">Get started <ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
          <Button asChild variant="outline" className="min-h-11"><Link to="/pricing">View plans</Link></Button>
        </div>
      </main>
      <footer className="border-t border-border">
        <nav aria-label="Footer navigation" className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><Link to="/support">Support</Link>
        </nav>
      </footer>
    </div>
  );
}