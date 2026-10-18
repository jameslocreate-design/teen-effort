import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SmartRecommendations from "@/components/SmartRecommendations";

const mocks = vi.hoisted(() => ({ insert: vi.fn(), link: null as { id: string } | null }));
const idea = { title: "Museum afternoon", description: "Explore the exhibits", estimated_cost: "$20", duration: "2 hours", vibe: "Creative", distance_miles: "3", url: "https://www.google.com/maps/search/?api=1&query=Museum%2C%20Columbus", rating: 4.5, review_count: 120 };
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "current-user" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const query = { select: () => query, eq: () => table === "date_reviews" || table === "calendar_entries" ? Promise.resolve({ data: [] }) : query, or: () => query, maybeSingle: async () => ({ data: mocks.link }), insert: (row: unknown) => mocks.insert(table, row) };
  return query;
} } }));
vi.mock("@/lib/date-planner", () => ({ generateDateIdeas: async () => [idea], UsageLimitError: class extends Error {} }));
vi.mock("@/lib/geo", () => ({ getCurrentCoords: async () => ({ latitude: 40, longitude: -83 }) }));
vi.mock("@/hooks/useUsage", () => ({ notifyUsageUpdated: vi.fn() }));
vi.mock("@/components/DateIdeaCard", () => ({ default: () => null }));
vi.mock("@/components/date-planner/DatePickerDialog", () => ({ default: ({ open, onDateSelect, onTimeChange, onConfirm }: any) => open ? <div><button onClick={() => { onDateSelect(new Date(2026, 9, 20)); onTimeChange("18:30"); }}>Select date</button><button onClick={onConfirm}>Confirm date</button></div> : null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => { mocks.link = null; mocks.insert.mockReset().mockResolvedValue({ error: null }); });
afterEach(cleanup);

async function generate() {
  render(<SmartRecommendations />);
  fireEvent.click(await screen.findByRole("button", { name: "Get Smart Recommendations" }));
  await screen.findByRole("button", { name: "Save" });
}

describe("Smart Recommendations persistence", () => {
  it("saves an unlinked user's suggestion and its venue metadata", async () => {
    await generate();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledWith("saved_date_ideas", {
      user_id: "current-user", title: idea.title, description: idea.description,
      estimated_cost: "$20", duration: "2 hours", vibe: "Creative", distance_miles: "3",
      yelp_url: idea.url, yelp_rating: 4.5, yelp_review_count: 120,
    }));
  });

  it("adds the selected suggestion to the linked calendar with local date and time", async () => {
    mocks.link = { id: "partner-link" };
    await generate();
    fireEvent.click(screen.getByRole("button", { name: "Add to Calendar" }));
    fireEvent.click(screen.getByRole("button", { name: "Select date" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm date" }));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledWith("calendar_entries", {
      partner_link_id: "partner-link", added_by: "current-user", date: "2026-10-20", event_time: "18:30",
      title: idea.title, description: idea.description, estimated_cost: "$20", duration: "2 hours", vibe: "Creative",
      yelp_url: idea.url, yelp_rating: 4.5, yelp_review_count: 120,
    }));
  });
});