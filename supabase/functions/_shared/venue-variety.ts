interface NamedVenue { name: string }

export function normalizeVenueName(name: string): string {
  return name.trim().toLowerCase().slice(0, 120);
}

export function recentVenueNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((name): name is string => typeof name === "string")
    .map(normalizeVenueName).filter(Boolean))].slice(0, 15);
}

export function shuffleVenues<T>(values: T[], random = Math.random): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Use all nearby places, excluding recent picks whenever three fresh places exist. */
export function selectVariedVenues<T extends NamedVenue>(venues: T[], recentValue: unknown, random = Math.random): T[] {
  const recent = recentVenueNames(recentValue);
  const seen = new Set<string>();
  const unique = venues.filter(venue => {
    const key = normalizeVenueName(venue.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const fresh = shuffleVenues(unique.filter(venue => !recent.includes(normalizeVenueName(venue.name))), random);
  if (fresh.length >= 3) return fresh.slice(0, 10);
  // Keep every fresh option and repeat only enough oldest picks to make a set.
  const repeats = unique.filter(venue => recent.includes(normalizeVenueName(venue.name)))
    .sort((a, b) => recent.indexOf(normalizeVenueName(b.name)) - recent.indexOf(normalizeVenueName(a.name)));
  return [...fresh, ...repeats.slice(0, 3 - fresh.length)];
}