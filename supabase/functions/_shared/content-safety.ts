// Server-side 13+ content safety: shared by every AI edge function.

export const SAFETY_PROMPT =
  "All content must be appropriate for users aged 13 and older. Keep the tone wholesome. Never produce or reference sexual, suggestive, or romantic-physical content, alcohol, drugs, tobacco, vaping, gambling, or violence.";

// Word-boundary blocklist of mature terms (applies to AI output AND user text going into prompts).
const BLOCK_TERMS = [
  // alcohol
  "alcohol", "alcoholic", "drink", "drinks", "drinking", "booze", "boozy", "bar", "bars", "barhop", "bar hop", "bar-hopping",
  "pub", "pubs", "tavern", "saloon", "taproom", "tap room", "brewery", "breweries", "brewpub", "microbrewery",
  "winery", "wineries", "vineyard tasting", "distillery", "cocktail", "cocktails", "mocktail bar", "beer", "beers",
  "wine", "wines", "champagne", "prosecco", "liquor", "whiskey", "whisky", "vodka", "tequila", "rum", "margarita",
  "mimosa", "sangria", "sake", "happy hour", "drunk", "tipsy", "buzzed", "hangover", "shots", "nightclub", "nightclubs",
  "club hopping", "lounge",
  // drugs / tobacco / vaping
  "drug", "drugs", "weed", "marijuana", "cannabis", "edible", "edibles", "stoned", "high on", "420", "cbd", "thc",
  "tobacco", "cigarette", "cigarettes", "cigar", "cigars", "hookah", "vape", "vaping", "vapes", "smoke shop", "smoking",
  // gambling
  "casino", "casinos", "gamble", "gambling", "betting", "poker", "slot machine", "slots", "blackjack", "roulette table",
  // sexual / suggestive / romantic-physical
  "sex", "sexy", "sexual", "sexually", "hookup", "hook up", "hooking up", "nude", "nudes", "naked", "nudity", "strip",
  "stripper", "strip club", "erotic", "sensual", "seductive", "seduce", "lingerie", "intimate", "intimacy", "bedroom",
  "make out", "making out", "makeout", "kiss", "kissing", "kisses", "cuddle in bed", "spicy night", "steamy", "naughty",
  "foreplay", "porn", "adult toy", "adult store", "onlyfans", "one night stand", "hotel room", "overnight stay",
  // violence
  "gun", "guns", "shooting range", "firearm", "firearms", "weapon", "weapons", "knife throwing", "axe throwing",
  "kill", "killing", "murder", "blood", "gore", "fight club",
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[ -]/g, "[\\s-]?");
const BLOCK_RE = new RegExp(`\\b(${BLOCK_TERMS.map(escape).join("|")})\\b`, "gi");

/** Returns the mature terms found in any string inside `value`. `ignore` strings (e.g. city names) are removed first. */
export function findMatureTerms(value: unknown, ignore: string[] = []): string[] {
  const parts: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") parts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(value);
  let text = parts.join(" \n ");
  for (const ig of ignore) if (ig) text = text.split(ig).join(" ");
  return [...new Set((text.match(BLOCK_RE) || []).map((m) => m.toLowerCase()))];
}

export const isSafe = (value: unknown, ignore: string[] = []) => findMatureTerms(value, ignore).length === 0;

/** Neutralize user-entered text before it is placed into a prompt. */
export function sanitizeUserText(input: unknown, maxLen = 500): string {
  if (input == null) return "";
  const s = Array.isArray(input) ? input.map(String).join(", ") : String(input);
  return s
    .slice(0, maxLen)
    .replace(/[`<>{}]/g, "")
    .replace(BLOCK_RE, "[removed]")
    .replace(/(\[removed\][\s,]*){2,}/g, "[removed] ")
    .trim();
}

// ---------- Venue filtering (OpenStreetMap tags) ----------

const BLOCK_AMENITY = /^(bar|pub|nightclub|biergarten|casino|gambling|stripclub|swingerclub|brothel|love_hotel|hookah_lounge|adult_gaming_centre|smoking_area|lounge)$/i;
const BLOCK_SHOP = /^(alcohol|wine|beverages|tobacco|e-cigarette|erotic|cannabis|smokeshop|vape|lottery|bookmaker|weapons|pawnbroker)$/i;
const BLOCK_CRAFT = /^(brewery|winery|distillery)$/i;
const BLOCK_NAME = /\b(bar|pub|tavern|saloon|taproom|tap room|tap house|taphouse|brew(ing|ery|pub|house|works)?|winery|wine|vineyards?|cellars?|distill(ery|ing)|spirits|liquor|beer|ale ?house|cocktails?|lounge|nightclub|club \d+|hookah|vape|smoke|tobacco|cigars?|casino|gaming|poker|bingo hall|gentlemen'?s|strip|adult|cabaret|speakeasy|bottle shop|growlers?|cider(y| house)|meadery|sake)\b/i;

/** True when an OSM element must never be shown to anyone (alcohol/adult/gambling/smoking venues). */
export function isBlockedVenue(tags: Record<string, string>): boolean {
  const name = tags.name || "";
  if (BLOCK_AMENITY.test(tags.amenity || "")) return true;
  if (BLOCK_SHOP.test(tags.shop || "")) return true;
  if (BLOCK_CRAFT.test(tags.craft || "") || /brewery|winery|distillery/i.test(tags.industrial || "")) return true;
  if (tags.microbrewery === "yes" || tags.brewery || tags["drink:wine"] === "served" && tags.amenity === "bar") return true;
  if (/^(adult|erotic|sex)/i.test(tags.leisure || "") || tags.adult === "yes" || tags["adult_gaming"] === "yes") return true;
  if (tags.leisure === "adult_gaming_centre" || tags.leisure === "hackerspace" && false) return true;
  if (tags.tourism === "wine_cellar" || /wine|brew/i.test(tags.tourism || "")) return true;
  if (tags.cuisine && /\b(pub|bar|beer|wine|tapas_bar|brewpub|gastropub)\b/i.test(tags.cuisine)) return true;
  // Restaurants / cafes that primarily serve alcohol
  if (/restaurant|cafe|fast_food/i.test(tags.amenity || "") && (tags.bar === "yes" && /bar|pub|tavern|brew|wine|lounge/i.test(name))) return true;
  if (BLOCK_NAME.test(name)) return true;
  return false;
}
