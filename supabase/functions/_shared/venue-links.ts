// Search only a place name, never an AI activity title or the user's coordinates.
export function buildVenueSearchUrl(venueName: unknown, city: string): string | undefined {
  if (typeof venueName !== "string" || !venueName.trim()) return undefined;
  const name = venueName.trim();
  const locality = city.trim();
  const query = locality ? `${name}, ${locality}` : name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}