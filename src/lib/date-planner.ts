import { DEMO_LIMIT_MESSAGE, demoAiRemaining, recordDemoAiRequest, DEMO_DAILY_AI_LIMIT } from "@/lib/demo";

export interface DateIdea {
  title: string;
  description: string;
  estimated_cost: string;
  duration: string;
  vibe: string;
  distance_miles: string;
  rating?: number;
  review_count?: number;
  url?: string;
}

export interface DateFilters {
  cost: string[] | null;
  location: string[] | null;
  activity: string[] | null;
  distance: string[] | null;
  timeRange: string | null;
  cuisine: string[] | null;
  latitude: number | null;
  longitude: number | null;
  funActivity: string[] | null;
  mood: string[] | null;
}

export class UsageLimitError extends Error {
  limit: number;
  feature: string;
  constructor(message: string, feature: string, limit: number) {
    super(message);
    this.name = "UsageLimitError";
    this.feature = feature;
    this.limit = limit;
  }
}

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export async function generateDateIdeas(filters: DateFilters): Promise<DateIdea[]> {
  if (demoAiRemaining() <= 0) {
    throw new UsageLimitError(DEMO_LIMIT_MESSAGE, "date_ideas", DEMO_DAILY_AI_LIMIT);
  }

  const includeEating = (filters.activity || []).includes("Eating out");

  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      "x-demo-mode": "true",
    },
    body: JSON.stringify({ ...filters, includeEating }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${resp.status})`);
  }

  const data = await resp.json();
  recordDemoAiRequest();
  return data.ideas || [];
}
