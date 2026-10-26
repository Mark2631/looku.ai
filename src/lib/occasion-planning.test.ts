import { describe, expect, it } from "vitest";
import { filterBudgetSafeProducts, findOccasionGaps } from "./occasion-planning";

const garment = (category: string, status: "available" | "laundry" | "retired" = "available") => ({
  category, is_owned: true, status,
});
const product = (id: string, category: string, price: number | null, currency = "KES") => ({
  id, category, price, currency,
});

describe("findOccasionGaps", () => {
  it("does not report core gaps when the wardrobe has a dress and suitable shoes", () => {
    expect(findOccasionGaps([garment("Dresses"), garment("Shoes")], "Birthday")).toEqual([]);
  });

  it("reports missing shoe and core categories rather than assuming a full new outfit", () => {
    expect(findOccasionGaps([garment("Tops"), garment("Bottoms")], "Birthday")).toEqual(["Shoes"]);
  });

  it("ignores laundry and retired pieces when checking what is available", () => {
    expect(findOccasionGaps([
      garment("Tops", "laundry"),
      garment("Bottoms", "retired"),
    ], "Birthday")).toEqual(["Dresses", "Tops", "Bottoms", "Shoes"]);
  });

  it("adapts requirements to the occasion", () => {
    expect(findOccasionGaps([garment("Dresses"), garment("Shoes")], "Formal event")).toEqual([]);
    expect(findOccasionGaps([garment("Tops"), garment("Bottoms"), garment("Shoes")], "Travel day")).toEqual(["Outerwear"]);
  });
  
  it("uses swimwear as the core outfit for a beach or pool event only", () => {
    expect(findOccasionGaps([garment("Swimwear"), garment("Shoes")], "Beach or pool day")).toEqual([]);
    expect(findOccasionGaps([garment("Swimwear"), garment("Shoes")], "Birthday")).toEqual(["Dresses", "Tops", "Bottoms"]);
  });

  it("does not count swimwear that is in the laundry", () => {
    expect(findOccasionGaps([garment("Swimwear", "laundry"), garment("Shoes")], "Beach or pool day")).toEqual(["Swimwear"]);
  });

  it("does not treat accessories as compulsory purchases", () => {
    expect(findOccasionGaps([garment("Dresses"), garment("Shoes")], "Birthday")).toEqual([]);
  });

  it("requires an owned, available item before counting its category", () => {
    expect(findOccasionGaps([
      { category: "Dresses", is_owned: false, status: "available" },
      garment("Tops"),
      garment("Bottoms"),
      garment("Shoes"),
    ], "Birthday")).toEqual([]);
  });
});

describe("filterBudgetSafeProducts", () => {
  const catalog = [
    product("shirt-3000", "Tops", 3000),
    product("shirt-3001", "Tops", 3001),
    product("unknown-price", "Tops", null),
    product("usd-shirt", "Tops", 20, "USD"),
    product("shoes", "Shoes", 2500),
    product("unrelated-dress", "Dresses", 1800),
  ];

  it("never returns a priced item above the user's budget", () => {
    expect(filterBudgetSafeProducts(catalog, ["Tops"], "3000").map(item => item.id)).toEqual(["shirt-3000"]);
  });

  it("does not present unpriced merchandise as within a stated budget", () => {
    expect(filterBudgetSafeProducts(catalog, ["Tops"], "3000").some(item => item.id === "unknown-price")).toBe(false);
  });

  it("keeps local KES prices and exact category gaps, not unrelated items", () => {
    expect(filterBudgetSafeProducts(catalog, ["Shoes"], "3000").map(item => item.id)).toEqual(["shoes"]);
  });

  it("allows all price levels only when the user has no budget cap", () => {
    expect(filterBudgetSafeProducts(catalog, ["Tops"], "").map(item => item.id)).toEqual(["shirt-3000", "shirt-3001", "unknown-price"]);
  });

  it("never recommends a purchase if no wardrobe gap has been identified", () => {
    expect(filterBudgetSafeProducts(catalog, [], "3000")).toEqual([]);
  });

  it("respects the requested result limit", () => {
    expect(filterBudgetSafeProducts(catalog, ["Tops", "Shoes"], "", 1).length).toBe(1);
  });
});
