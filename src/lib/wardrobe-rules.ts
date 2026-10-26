export type WardrobeCategoryItem = { id: string; category: string };
export type OutfitWithItems = { itemIds: string[] };
export type ProductBudgetItem = { category: string; currency: string; price: number | null };

const OCCASION_CATEGORIES: Record<string, string[]> = {
  "Birthday": ["Tops", "Bottoms", "Dresses", "Shoes", "Accessories"],
  "Graduation": ["Tops", "Bottoms", "Dresses", "Shoes", "Outerwear"],
  "Date night": ["Tops", "Bottoms", "Dresses", "Shoes", "Accessories"],
  "Wedding guest": ["Dresses", "Tops", "Bottoms", "Shoes", "Accessories"],
  "Campus event": ["Tops", "Bottoms", "Shoes", "Outerwear"],
  "Job interview": ["Tops", "Bottoms", "Shoes", "Outerwear"],
  "Dinner": ["Tops", "Bottoms", "Dresses", "Shoes"],
  "Family celebration": ["Tops", "Bottoms", "Dresses", "Shoes", "Accessories"],
  "Church or faith ceremony": ["Tops", "Bottoms", "Dresses", "Shoes", "Outerwear"],
  "Workday": ["Tops", "Bottoms", "Shoes", "Outerwear"],
  "Travel day": ["Tops", "Bottoms", "Shoes", "Outerwear"],
  "Outdoor event": ["Tops", "Bottoms", "Dresses", "Shoes", "Outerwear"],
  "Gym or active": ["Activewear", "Shoes"],
  "Formal event": ["Tops", "Bottoms", "Dresses", "Shoes", "Outerwear"],
  "Online interview": ["Tops", "Bottoms", "Dresses", "Outerwear"],
  "Campus date": ["Tops", "Bottoms", "Dresses", "Shoes", "Accessories"],
};

/**
 * Only keep references to real, available wardrobe items and outfits that meet
 * the minimum completion rules. The model is not trusted to invent item IDs.
 */
export function filterCompleteOutfits<T extends OutfitWithItems>(
  suggestions: T[],
  wardrobe: WardrobeCategoryItem[],
): T[] {
  const categoryById = new Map(wardrobe.map(item => [item.id, item.category]));
  const availableShoesExist = wardrobe.some(item => item.category === "Shoes");

  return suggestions
    .map(suggestion => ({
      ...suggestion,
      itemIds: Array.from(new Set(suggestion.itemIds)).filter(id => categoryById.has(id)),
    }))
    .filter(suggestion => {
      if (suggestion.itemIds.length < 2) return false;
      const categories = suggestion.itemIds.map(id => categoryById.get(id));
      const completeBase = categories.includes("Dresses") ||
        (categories.includes("Tops") && categories.includes("Bottoms"));
      const includesFootwearWhenAvailable = !availableShoesExist || categories.includes("Shoes");
      return completeBase && includesFootwearWhenAvailable;
    });
}

/**
 * Purchase gaps are alternatives, not a list of mandatory items. A dress can
 * replace a top+bottom combination; accessories are never required by default.
 */
export function getPotentialShoppingGaps(owned: Iterable<string>, occasion: string): string[] {
  const ownedCategories = new Set(owned);
  const eventNeeds = OCCASION_CATEGORIES[occasion] || OCCASION_CATEGORIES.Birthday;
  const hasDress = ownedCategories.has("Dresses");
  const hasTop = ownedCategories.has("Tops");
  const hasBottom = ownedCategories.has("Bottoms");
  const coreCovered = hasDress || (hasTop && hasBottom);
  const gaps: string[] = [];

  if (!coreCovered) {
    if (!hasTop && !hasBottom && !hasDress) gaps.push("Dresses", "Tops", "Bottoms");
    else if (hasTop && !hasBottom) gaps.push("Bottoms", "Dresses");
    else if (hasBottom && !hasTop) gaps.push("Tops", "Dresses");
    else if (!hasDress && (!hasTop || !hasBottom)) gaps.push(!hasTop ? "Tops" : "Bottoms");
  }
  if (eventNeeds.includes("Shoes") && !ownedCategories.has("Shoes")) gaps.push("Shoes");
  if (["Travel day", "Outdoor event"].includes(occasion) && !ownedCategories.has("Outerwear")) gaps.push("Outerwear");
  if (occasion === "Gym or active" && !ownedCategories.has("Activewear")) gaps.push("Activewear");

  return Array.from(new Set(gaps));
}

export function isWithinBudget(product: ProductBudgetItem, budgetText: string): boolean {
  const normalized = budgetText.trim();
  if (!normalized) return true;
  const budget = Number(normalized);
  if (!Number.isFinite(budget) || budget < 0) return false;
  return product.price !== null && Number.isFinite(product.price) && product.price <= budget;
}

export function filterProductsForGaps<T extends ProductBudgetItem>(
  products: T[],
  missingCategories: string[],
  budgetText: string,
): T[] {
  return products
    .filter(product => product.currency === "KES" && isWithinBudget(product, budgetText))
    .filter(product => {
      const category = product.category.toLowerCase();
      return missingCategories.some(need =>
        category.includes(need.toLowerCase()) || need.toLowerCase().includes(category)
      );
    })
    .slice(0, 8);
}
