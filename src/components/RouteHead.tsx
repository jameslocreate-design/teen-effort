import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

export const SITE_ORIGIN = "https://teeneffort.app";

type Meta = { title: string; description: string };

const PAGES: Record<string, Meta> = {
  "/": { title: "Teen Effort — Curated Date Planning", description: "Plan thoughtful dates with real nearby venues, gift ideas, a shared calendar and relationship widgets." },
  "/app": { title: "Sign In or Create an Account — Teen Effort", description: "Log in or create your Teen Effort account to plan dates, save ideas and link with your partner." },
  "/pricing": { title: "Pricing & Plans — Teen Effort", description: "Compare Teen Effort's Free, Spark, Romance and Soulmate plans for date ideas, gifts and more." },
  "/terms": { title: "Terms of Service — Teen Effort", description: "The terms that apply when you use Teen Effort's website and iPhone app." },
  "/privacy": { title: "Privacy Policy — Teen Effort", description: "How Teen Effort collects, uses, protects and deletes your information." },
  "/support": { title: "Support & Contact — Teen Effort", description: "Get help with your Teen Effort account, subscriptions, partner linking and privacy." },
  "/date-log": { title: "Date Log — Teen Effort", description: "Your private log of past dates and memories on Teen Effort." },
  "/admin": { title: "Admin Login — Teen Effort", description: "Teen Effort administrator sign-in." },
  "/admin/dashboard": { title: "Admin Dashboard — Teen Effort", description: "Teen Effort administration tools." },
  "/checkout/return": { title: "Checkout Complete — Teen Effort", description: "Confirming your Teen Effort subscription purchase." },
  "/reset-password": { title: "Reset Your Password — Teen Effort", description: "Choose a new password for your Teen Effort account." },
  "/unsubscribe": { title: "Email Preferences — Teen Effort", description: "Unsubscribe from Teen Effort emails." },
};

export function canonicalPath(pathname: string): string {
  const clean = pathname.split(/[?#]/)[0].replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
}

export function metaFor(path: string): Meta {
  if (PAGES[path]) return PAGES[path];
  if (path.startsWith("/link/")) return { title: "Link With Your Partner — Teen Effort", description: "Accept a partner invitation to link your Teen Effort accounts." };
  if (path.startsWith("/.lovable/oauth")) return { title: "Authorize Access — Teen Effort", description: "Review and approve app access to your Teen Effort account." };
  return { title: "Page Not Found — Teen Effort", description: "This Teen Effort page doesn't exist. Head back to the homepage to plan your next date." };
}

const RouteHead = () => {
  const { pathname } = useLocation();
  const path = canonicalPath(pathname);
  const { title, description } = metaFor(path);
  const url = SITE_ORIGIN + path;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
};

export default RouteHead;
