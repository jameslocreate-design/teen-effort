import { describe, expect, it } from "vitest";
import { buildVenueSearchUrl } from "../../supabase/functions/_shared/venue-links";

describe("venue search links", () => {
  it("searches the venue name and city, preserving special characters", () => {
    const url = buildVenueSearchUrl("  Art & Science Museum  ", "Columbus, Ohio");
    expect(url).toBeDefined();
    expect(new URL(url ?? "").searchParams.get("query")).toBe("Art & Science Museum, Columbus, Ohio");
  });

  it("does not create a venue link when the venue name is missing", () => {
    expect(buildVenueSearchUrl(null, "Columbus, Ohio")).toBeUndefined();
    expect(buildVenueSearchUrl("  ", "Columbus, Ohio")).toBeUndefined();
  });
});