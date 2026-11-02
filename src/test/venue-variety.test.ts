import { describe, expect, it } from "vitest";
import { recentVenueNames, selectVariedVenues } from "../../supabase/functions/_shared/venue-variety";

describe("date suggestion variety", () => {
  it("excludes COSI after it was shown when three fresh places exist", () => {
    const venues = ["COSI", "Park", "Cinema", "Bowling"].map(name => ({ name }));
    const selected = selectVariedVenues(venues, [" cosi "]);
    expect(selected.map(venue => venue.name).sort()).toEqual(["Bowling", "Cinema", "Park"]);
  });
  it("samples beyond the closest fifteen venues", () => {
    const venues = Array.from({ length: 25 }, (_, index) => ({ name: `Place ${index}` }));
    expect(selectVariedVenues(venues, [], () => 0.04).map(venue => venue.name)).toContain("Place 24");
  });
  it("only repeats enough oldest places to fill three suggestions", () => {
    const venues = ["COSI", "Park", "Cinema", "Bowling"].map(name => ({ name }));
    expect(selectVariedVenues(venues, ["COSI", "Park"]).map(venue => venue.name).sort())
      .toEqual(["Bowling", "Cinema", "Park"]);
  });
  it("remembers the most recent fifteen distinct places", () => {
    expect(recentVenueNames([" COSI ", "cosi", ...Array.from({ length: 20 }, (_, i) => `Place ${i}`)]))
      .toEqual(["cosi", ...Array.from({ length: 14 }, (_, i) => `place ${i}`)]);
  });
  it("ignores malformed history and duplicate venue names", () => {
    expect(recentVenueNames({ name: "COSI" })).toEqual([]);
    expect(selectVariedVenues([{ name: "COSI" }, { name: " cosi " }], [null, 1])).toHaveLength(1);
  });
});