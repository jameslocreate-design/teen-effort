export interface DateIdea {
  title: string;
  description: string;
  estimated_cost: string;
  duration: string;
  vibe: string;
}

export interface DateFilters {
  cost: string | null;
  location: string | null;
  activity: string | null;
  distance: string | null;
}

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export async function generateDateIdeas(filters: DateFilters): Promise<DateIdea[]> {
  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(filters),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${resp.status})`);
  }

  const data = await resp.json();
  return data.ideas || [];
}
