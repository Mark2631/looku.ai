export type OccasionWardrobeItem = {
  category: string;
  is_owned: boolean;
  status: "available" | "laundry" | "retired" | string;
};

export type BudgetProduct = {
  id: string;
  category: string;
  currency: string;
  price: number | null;
};

export const OCCASION_CATEGORY_NEEDS: Record<string, string[]> = {
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
  "Conference / networking": ["Tops", "Bottoms", "Shoes", "Outerwear"],
  "Concert / festival": ["Tops", "Bottoms", "Dresses", "Shoes", "Outerwear", "Accessories"],
  "Beach or pool day": ["Swimwear", "Shoes", "Accessories"],
  "Photoshoot": ["Tops", "Bottoms", "Dresses", "Shoes", "Accessories"],
  "Baby shower": ["Tops", "Bottoms", "Dresses", "Shoes"],
  "First day at work": ["Tops", "Bottoms", "Shoes", "Outerwear"],
};

export function findOccasionGaps(items: OccasionWardrobeItem[], occasion: string): string[] {
  const ownedCategories = new Set(
    items
      .filter(item => item.is_owned && item.status === "available")
      .map(item => item.category),
  );
  const hasDress = ownedCategories.has("Dresses");
  const hasTop = ownedCategories.has("Tops");
  const hasBottom = ownedCategories.has("Bottoms");
  const needs = OCCASION_CATEGORY_NEEDS[occasion] || OCCASION_CATEGORY_NEEDS.Birthday;
  const swimwearIsCore = needs.includes("Swimwear");
  const hasSwimwear = ownedCategories.has("Swimwear");
  const hasCompleteCore = hasDress || (hasTop && hasBottom) || (swimwearIsCore && hasSwimwear);
  const gaps: string[] = [];

  if (swimwearIsCore) {
    if (!hasSwimwear) gaps.push("Swimwear");
  } else if (!hasCompleteCore) {
    if (!hasTop && !hasBottom && !hasDress) gaps.push("Dresses", "Tops", "Bottoms");
    else if (hasTop && !hasBottom) gaps.push("Bottoms", "Dresses");
    else if (hasBottom && !hasTop) gaps.push("Tops", "Dresses");
  }

  if (needs.includes("Shoes") && !ownedCategories.has("Shoes")) gaps.push("Shoes");
  if (["Travel day", "Outdoor event", "Concert / festival"].includes(occasion) && !ownedCategories.has("Outerwear")) gaps.push("Outerwear");
  if (needs.includes("Activewear") && !ownedCategories.has("Activewear")) gaps.push("Activewear");
  if (needs.includes("Accessories") && !ownedCategories.has("Accessories")) gaps.push("Accessories");

  // An owned dress is a valid core outfit by itself. Do not tell the user to buy a top/bottom
  // just because they aren't needed for a dress-based alternative.
  return Array.from(new Set(gaps));
}

export function filterBudgetSafeProducts<T extends BudgetProduct>(
  products: T[],
  missingCategories: string[],
  budgetInput: string,
  limit = 8,
): T[] {
  if (missingCategories.length === 0) return [];
  const hasBudget = budgetInput.trim() !== "" && Number.isFinite(Number(budgetInput));
  const budget = hasBudget ? Number(budgetInput) : null;

  return products
    .filter(product => product.currency === "KES")
    .filter(product => {
      if (!hasBudget) return true;
      // When a cap is supplied, unpriced products cannot be asserted to be within budget.
      return product.price !== null && budget !== null && Number.isFinite(product.price) && product.price <= budget;
    })
    .filter(product => {
      const category = product.category.toLowerCase();
      return missingCategories.some(need => {
        const normalizedNeed = need.toLowerCase();
        return category === normalizedNeed
          || category.includes(normalizedNeed)
          || normalizedNeed.includes(category);
      });
    })
    .slice(0, Math.max(0, Math.min(20, Math.floor(limit))));
}
