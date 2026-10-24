import { describe, expect, it } from "vitest";
import { matchVerifiedVenue, searchRadiusMeters, validCoordinates } from "../../supabase/functions/_shared/venue-locality";
describe("nearby venue enforcement", () => {
  it("rejects Cincinnati outside the Columbus search radius", () => {
    expect(matchVerifiedVenue("Cincinnati Museum", [{ name: "Cincinnati Museum", distance_miles: 100 }], searchRadiusMeters(null))).toBeUndefined();
  });
  it("rejects invented or partial venue names", () => {
    expect(matchVerifiedVenue("Museum", [{ name: "Columbus Museum of Art", distance_miles: 4 }], searchRadiusMeters(null))).toBeUndefined();
  });
  it("accepts exact nearby venues", () => {
    expect(matchVerifiedVenue(" Columbus Museum of Art ", [{ name: "Columbus Museum of Art", distance_miles: 4 }], searchRadiusMeters(["5 miles"]))?.name).toBe("Columbus Museum of Art");
  });
  it("honors the largest selected distance", () => { expect(searchRadiusMeters(["5 miles", "20 miles"])).toBe(32186.88); });
  it("rejects invalid location values", () => { expect(validCoordinates(NaN, -83)).toBe(false); expect(validCoordinates(40, -83)).toBe(true); });
});