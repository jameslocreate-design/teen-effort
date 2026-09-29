import { UsageLimitError } from "./date-planner";
import { DEMO_LIMIT_MESSAGE, demoAiRemaining, recordDemoAiRequest, DEMO_DAILY_AI_LIMIT } from "@/lib/demo";

export interface GiftIdea {
  title: string;
  description: string;
  estimated_cost: string;
  where_to_buy: string;
  where_to_buy_url: string;
  personalization_tip: string;
  vibe: string;
}

export interface GiftFilters {
  cost: string | null;
  personalization: string | null;
  event: string | null;
}

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gift-ideas`;

export async function generateGiftIdeas(filters: GiftFilters): Promise<GiftIdea[]> {
  if (demoAiRemaining() <= 0) {
    throw new UsageLimitError(DEMO_LIMIT_MESSAGE, "gift_ideas", DEMO_DAILY_AI_LIMIT);
  }

  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      "x-demo-mode": "true",
    },
    body: JSON.stringify(filters),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${resp.status})`);
  }

  const data = await resp.json();
  recordDemoAiRequest();
  return data.ideas || [];
}
