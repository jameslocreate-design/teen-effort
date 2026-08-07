import { Link } from "react-router-dom";
import { Heart, Mail, ShieldAlert, Clock } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const SUPPORT_EMAIL = "support@teeneffort.app";
const SAFETY_EMAIL = "safety@teeneffort.app";

const faqs = [
  {
    q: "How do I create an account?",
    a: "Open Teen Effort, tap Sign Up, and enter your email (or use Sign in with Apple). We'll email you a verification code — enter it to finish creating your account. You'll then add your name and birthday, and you can optionally link with your partner using an invite code.",
  },
  {
    q: "How do I delete my account and data?",
    a: "In the app, open Settings and scroll to the Danger Zone, then tap Delete Account. This permanently removes your profile, saved date ideas, journal entries, and all associated data. If you can't access the app, email us and we'll delete your account for you.",
  },
  {
    q: "How do I report inappropriate content or another user?",
    a: "Every piece of shared content and every partner profile has a report option. You can also email us directly at " +
      SAFETY_EMAIL +
      " with details and a screenshot if possible. We review every report and can remove content, block users, and terminate accounts.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. Your data is stored securely, protected by row-level access rules so only you (and a partner you explicitly link with) can see your content. We never sell your data. See our Privacy Policy for the full details on what we collect and why.",
    privacyLink: true,
  },
  {
    q: "What age do I need to be to use Teen Effort?",
    a: "Teen Effort is intended for users 13 and older. We ask for your birthday at signup, and accounts belonging to users under 13 are removed. Some features may be limited for younger users.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "If you subscribed on iPhone, open the iOS Settings app, tap your name, then Subscriptions, select Teen Effort, and tap Cancel Subscription. If you subscribed on the web, open Settings in the app and use Manage Subscription to open the billing portal. You keep access until the end of your current billing period.",
  },
];

export default function Support() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-10">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="h-4 w-4 text-primary" />
            </span>
            <span className="font-display italic text-lg text-primary">Teen Effort</span>
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-6">Support &amp; Help</h1>
          <p className="text-sm text-muted-foreground mt-2 font-sans">
            Answers to common questions, plus how to reach a real person.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-12">
        {/* Contact */}
        <section>
          <h2 className="font-display text-2xl font-semibold mb-4">Contact Us</h2>
          <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-3">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-3 text-primary font-medium break-all"
            >
              <Mail className="h-4 w-4 flex-shrink-0" />
              {SUPPORT_EMAIL}
            </a>
            <p className="flex items-start gap-3 text-sm text-muted-foreground font-sans">
              <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
              We typically respond within 1–2 business days.
            </p>
          </div>
        </section>

        {/* Safety */}
        <section>
          <h2 className="font-display text-2xl font-semibold mb-4">Safety &amp; Reporting</h2>
          <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-5 space-y-3">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2 text-primary">
              <ShieldAlert className="h-5 w-5" />
              Report a Safety Concern
            </h3>
            <p className="text-sm font-sans text-foreground/90">
              For urgent safety issues — harassment, threats, sexual content involving minors, or
              anything that puts someone at risk — contact us directly:
            </p>
            <a
              href={`mailto:${SAFETY_EMAIL}?subject=Urgent%20Safety%20Report`}
              className="inline-flex items-center gap-2 text-primary font-semibold break-all"
            >
              <Mail className="h-4 w-4 flex-shrink-0" />
              {SAFETY_EMAIL}
            </a>
            <p className="text-xs font-sans text-muted-foreground">
              Every report is reviewed by a real person on our team — not just automated systems. We
              aim to respond to safety reports within 24 hours. If someone is in immediate danger,
              contact your local emergency services first.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="font-display text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left font-sans text-sm sm:text-base">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground font-sans leading-relaxed">
                  {f.a}
                  {f.privacyLink && (
                    <>
                      {" "}
                      <Link to="/privacy" className="text-primary underline underline-offset-2">
                        Read the Privacy Policy
                      </Link>
                      .
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-3 text-sm font-sans">
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/privacy" className="text-primary underline underline-offset-2">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-primary underline underline-offset-2">
              Terms of Service
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Teen Effort. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
