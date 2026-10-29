export type MatchItem = {
  id: string;
  name: string;
  category: string;
  colors?: string[] | null;
  formality?: number | null;
  status?: string;
  is_owned?: boolean;
  style_tags?: string[] | null;
  pattern?: string | null;
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
  prompt = "",
  stylePreference = "",
  preferredColors: string[] = [],
): MatchLook[] {
  const items = wardrobe.filter(i => i.is_owned !== false && (!i.status || i.status === "available"));
  const category = (name: string) => items.filter(i => i.category === name);
  const intent = (occasion + " " + prompt).toLowerCase();
  const colorNames = ["black","white","cream","beige","grey","gray","navy","blue","red","pink","purple","orange","rust","brown","green","yellow","gold","silver","khaki","denim"];
  const requestedColors = colorNames.filter(color => new RegExp("\\b" + color + "\\b").test(prompt.toLowerCase()));
  const promptAvoidedColors = colorNames.filter(color =>
    new RegExp("\\b(?:avoid|without|no|skip|don't want|dont want|do not want|don't use|dont use|do not use)\\b.{0,24}\\b" + color + "\\b").test(prompt.toLowerCase())
  );
  const colorsToAvoid = [...new Set([...avoidedColors, ...promptAvoidedColors])];
  const styleTokens = stylePreference.toLowerCase().split(/[^a-z]+/).filter(token => token.length >= 4);
  function contextScore(item: MatchItem): number {
    const description = [item.name, item.category, ...(item.style_tags || []), item.pattern || ""].join(" ").toLowerCase();
    let score = 0;
    for (const color of requestedColors) {
      if ((item.colors || []).some(value => value.toLowerCase().includes(color) || (color === "red" && /burgundy|maroon/.test(value.toLowerCase())))) score += 2.5;
    }
    for (const color of preferredColors) {
      if ((item.colors || []).some(value => value.toLowerCase().includes(color.toLowerCase()))) score += 0.55;
    }
    for (const token of styleTokens) if (description.includes(token)) score += 0.3;
    if (/date night|dinner|evening|party|cocktail|celebration|wedding/.test(intent) && (item.category === "Dresses" || (item.formality ?? 5) >= 6)) score += 0.8;
    if (/office|work meeting|interview|presentation|conference/.test(intent) && (item.formality ?? 5) >= 6) score += 0.8;
    if (/casual|campus|everyday|errands|travel|comfortable|comfy/.test(intent) && (item.formality ?? 5) <= 5) score += 0.6;
    if (/wide[- ]leg|palazzo/.test(intent) && /wide[- ]leg|palazzo/.test(description)) score += 1.2;
    if (/african print|kitenge|ankara/.test(intent) && /african.print|kitenge|ankara/.test(description)) score += 1.8;
    if (/minimal|simple|neutral|classic/.test(intent) && /minimal|simple|neutral|classic/.test(description)) score += 0.7;
    if (/relaxed|loose|oversized/.test(intent) && /relaxed|loose|oversized|wide[- ]leg/.test(description)) score += 0.7;
    return score;
  }
  const shoes = category("Shoes");
  const tops = category("Tops");
  const bottoms = category("Bottoms");
  const dresses = category("Dresses");
  const swimwear = category("Swimwear");
  const accessories = [...category("Accessories"), ...category("Bags"), ...category("Outerwear")];
  const isSwim = /\b(beach|pool|swim|swimming)\b/i.test(occasion);
  const required = matchesOccasionFormality(intent);
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
        + contextScore(item)
        - ((item.colors || []).some(c => colorsToAvoid.some(avoid => c.toLowerCase().includes(avoid.toLowerCase()))) ? 5 : 0), 0)
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
  const preferredTypes = new Set<string>();
  const deferred: typeof candidates = [];
  const looks: MatchLook[] = [];
  const targetCount = Math.max(1, Math.min(count, 3));
  const coreCategories = new Set(["Tops", "Bottoms", "Dresses", "Swimwear"]);
  const toLook = (candidate: typeof candidates[number]): MatchLook => {
    const ids = candidate.pieces.map(p => p.id);
    const labels = candidate.pieces.map(item => item.name);
    return {
      title: labels.length > 2 ? labels[0] + " + " + labels[1] + " edit" : labels.join(" + "),
      style: "Wardrobe match",
      reason: (() => {
        const selectedColors = requestedColors.filter(color => candidate.pieces.some(item => (item.colors || []).some(value => value.toLowerCase().includes(color))));
        let contextReason = "I matched pieces you already have and ranked the combination for " + occasion.toLowerCase() + ".";
        if (/date night|dinner|evening/.test(intent)) contextReason = "For your evening plan, this leans more polished while staying within your wardrobe.";
        else if (/office|work meeting|interview|presentation|conference/.test(intent)) contextReason = "For your work setting, this keeps the combination more structured without adding a purchase.";
        else if (/casual|campus|everyday|errands|travel|comfortable|comfy/.test(intent)) contextReason = "For a day on the move, this keeps the outfit relaxed and easy to repeat.";
        if (selectedColors.length) contextReason += " It includes the " + selectedColors.join(" and ") + " you mentioned.";
        if (stylePreference.trim()) contextReason += " I also considered your " + stylePreference.trim().toLowerCase() + " preference.";
        return contextReason;
      })(),
      itemIds: ids,
      confidenceNote: "Rule-based combination, not an AI-generated or visually verified outfit.",
    };
  };
  // Show a dress option alongside separates before spending all three slots on top/bottom permutations.
  for (const candidate of candidates) {
    const ids = candidate.pieces.map(p => p.id);
    const key = [...ids].sort().join("|");
    if (unique.has(key)) continue;
    unique.add(key);
    const signature = candidate.pieces.map(piece => piece.category).filter(category => coreCategories.has(category)).sort().join("+");
    if (!preferredTypes.has(signature) && looks.length < targetCount) {
      looks.push(toLook(candidate));
      preferredTypes.add(signature);
    } else deferred.push(candidate);
  }
  for (const candidate of deferred) {
    if (looks.length >= targetCount) break;
    looks.push(toLook(candidate));
  }
  return looks;
}
