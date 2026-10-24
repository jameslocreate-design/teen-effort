export function validCoordinates(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}
export function searchRadiusMeters(distance: unknown) {
  const text = Array.isArray(distance) ? distance.join(" ") : String(distance || "");
  const values = [...text.matchAll(/\b(5|10|15|20) miles\b/g)].map(match => Number(match[1]));
  return (values.length ? Math.max(...values) : 10) * 1609.344;
}
export function withinRadius(miles: number, radiusMeters: number) {
  return Number.isFinite(miles) && miles >= 0 && miles * 1609.344 <= radiusMeters;
}
export function matchVerifiedVenue<T extends { name: string; distance_miles: number }>(name: unknown, venues: T[], radius: number): T | undefined {
  if (typeof name !== "string") return undefined;
  const normalized = name.trim().toLocaleLowerCase();
  return venues.find(venue => venue.name.trim().toLocaleLowerCase() === normalized && withinRadius(venue.distance_miles, radius));
}