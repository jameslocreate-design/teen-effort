/**
 * WEB-ONLY DEMO MODE.
 *
 * This build has no accounts. The tester's profile, chosen demo tier and daily
 * AI request counter all live in this browser's localStorage only — nothing is
 * sent to any backend or database.
 */

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_PARTNER_ID = "00000000-0000-4000-8000-000000000002";
export const DEMO_LINK_ID = "00000000-0000-4000-8000-000000000003";

export const DEMO_DAILY_AI_LIMIT = 20;

const PROFILE_KEY = "demo-profile";
const TIER_KEY = "demo-tier";
const USAGE_KEY = "demo-ai-usage";

export const DEMO_FOOTER_NOTE =
  "Demo build for private testing. No account is created and your info stays on this device.";

export interface DemoProfile {
  name: string;
  birthYear: number;
  gender: string | null;
  descriptors: string[];
  loveLanguages: string[];
  partnerName: string;
  createdAt: string;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — demo simply won't remember */
  }
}

/* ---------------------------------------------------------------- profile */

export function getDemoProfile(): DemoProfile | null {
  const p = read<DemoProfile>(PROFILE_KEY);
  if (!p || !p.name) return null;
  return {
    gender: null,
    descriptors: [],
    loveLanguages: [],
    partnerName: "",
    ...p,
  };
}

export function saveDemoProfile(profile: Omit<DemoProfile, "createdAt">) {
  const existing = getDemoProfile();
  write(PROFILE_KEY, {
    ...profile,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });
  window.dispatchEvent(new CustomEvent("demo-profile-updated"));
}

/** Wipes every trace of the tester's demo data from this device. */
export function resetDemoData() {
  try {
    const keep = ["theme"];
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !keep.includes(k)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ tiers */

/** 0 = Free, 1 = Spark, 2 = Romance, 3 = Soulmate */
export function getDemoTier(): number {
  const t = Number(localStorage.getItem(TIER_KEY) ?? "0");
  return Number.isFinite(t) && t >= 0 && t <= 3 ? t : 0;
}

export function setDemoTier(tier: number) {
  try {
    localStorage.setItem(TIER_KEY, String(tier));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("demo-tier-changed"));
}

/* ------------------------------------------------------------ AI throttle */

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface UsageRecord {
  day: string;
  count: number;
}

export function getDemoAiCount(): number {
  const rec = read<UsageRecord>(USAGE_KEY);
  if (!rec || rec.day !== today()) return 0;
  return rec.count;
}

export function demoAiRemaining(): number {
  return Math.max(0, DEMO_DAILY_AI_LIMIT - getDemoAiCount());
}

export function recordDemoAiRequest() {
  write(USAGE_KEY, { day: today(), count: getDemoAiCount() + 1 });
  window.dispatchEvent(new CustomEvent("usage:updated"));
}

export const DEMO_LIMIT_MESSAGE = `You've used all ${DEMO_DAILY_AI_LIMIT} idea generations for today on this device. The demo limit resets tomorrow.`;
