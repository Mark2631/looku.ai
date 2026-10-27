export type MatchItem = {
  id: string;
  name: string;
  category: string;
  colors?: string[] | null;
  formality?: number | null;
  status?: string;
  is_owned?: boolean;
};

export type MatchLook = {
  title: string;
  style: string;
  reason: string;
  itemIds: string[];
  confidenceNote: string;
};

function matchesOccasionFormality(occasion: string): number {
  const v = occasion.toLowerCase();
  if (/formal|wedding|graduation|ceremony|interview|conference/.test(v)) return 8;
  if (/work|dinner|date|birthday|celebration|event/.test(v)) return 6;
  if (/gym|home|sleep|beach|pool|swim/.test(v)) return 2;
  return 4;
}

function colorBalance(left: MatchItem, right: MatchItem): number {
  const a = (left.colors || []).map(c => c.toLowerCase());
  const b = (right.colors || []).map(c => c.toLowerCase());
  const neutrals = ["black", "white", "cream", "beige", "grey", "gray", "navy", "brown", "denim", "khaki"];
  if (!a.length || !b.length) return 0;
  const same = a.some(c => b.some(d => c === d));
  const neutral = a.some(c => neutrals.some(n => c.includes(n))) || b.some(c => neutrals.some(n => c.includes(n)));
  return (neutral ? 2 : 0) + (same ? 1 : 0);
}

/** A non-AI wardrobe fallback. Never invents pieces, bodies, weather, sizes or product listings. */
export function matchWardrobeOutfits(
  wardrobe: MatchItem[],
  occasion: string,
  count = 3,
  avoidIds: string[] = [],
  likedIds: string[] = [],
  dislikedIds: string[] = [],
  avoidedColors: string[] = [],
): MatchLook[] {
  const items = wardrobe.filter(i => i.is_owned !== false && (!i.status || i.status === "available"));
  const category = (name: string) => items.filter(i => i.category === name);
  const shoes = category("Shoes");
  const tops = category("Tops");
  const bottoms = category("Bottoms");
  const dresses = category("Dresses");
  const swimwear = category("Swimwear");
  const accessories = [...category("Accessories"), ...category("Bags"), ...category("Outerwear")];
  const isSwim = /\b(beach|pool|swim|swimming)\b/i.test(occasion);
  const required = matchesOccasionFormality(occasion);
  const candidates: { pieces: MatchItem[]; score: number }[] = [];
  const add = (base: MatchItem[]) => {
    const groups = shoes.length ? shoes : [null];
    for (const shoe of groups) {
      const selected = shoe ? [...base, shoe] : [...base];
      // Accessories are optional, and may add variety but should not create a mandatory purchase.
      const extra = accessories.find(a => !selected.some(p => p.id === a.id));
      if (extra && selected.length < 4) selected.push(extra);
      const ids = [...new Set(selected.map(i => i.id))];
      if (ids.length < 2) continue;
      const score = selected.reduce((total, item) =>
        total - Math.abs((item.formality ?? 5) - required) * 0.6
        - (avoidIds.includes(item.id) ? 2.5 : 0)
        + (likedIds.includes(item.id) ? 1.2 : 0)
        - (dislikedIds.includes(item.id) ? 1.0 : 0)
        - ((item.colors || []).some(c => avoidedColors.some(avoid => c.toLowerCase().includes(avoid.toLowerCase()))) ? 5 : 0), 0)
        + (base.length > 1 ? colorBalance(base[0], base[1]) : 0)
        + (shoe ? 2 : 0);
      candidates.push({ pieces: selected, score });
    }
  };
  if (isSwim) swimwear.forEach(item => add([item]));
  if (!isSwim) {
    for (const top of tops) for (const bottom of bottoms) add([top, bottom]);
    dresses.forEach(dress => add([dress]));
  }
  candidates.sort((a, b) => b.score - a.score);
  const unique = new Set<string>();
  const looks: MatchLook[] = [];
  for (const candidate of candidates) {
    const ids = candidate.pieces.map(p => p.id);
    const key = [...ids].sort().join("|");
    if (unique.has(key)) continue;
    unique.add(key);
    const labels = candidate.pieces.map(item => item.name);
    looks.push({
      title: labels.length > 2 ? labels[0] + " + " + labels[1] + " edit" : labels.join(" + "),
      style: "Wardrobe match",
      reason: "Made from your available " + candidate.pieces.map(item => item.category.toLowerCase()).join(", ") +
        ". Ranked by the occasion's approximate formality and the colors you recorded. Check comfort, fit, and dress code yourself.",
      itemIds: ids,
      confidenceNote: "Rule-based combination, not an AI-generated or visually verified outfit.",
    });
    if (looks.length >= Math.max(1, Math.min(count, 3))) break;
  }
  return looks;
}
