import test from "node:test";
import assert from "node:assert/strict";
import {
  filterCompleteOutfits,
  filterProductsForGaps,
  getPotentialShoppingGaps,
  isWithinBudget,
} from "../src/lib/wardrobe-rules";

const coreWardrobe = [
  { id: "top-1", category: "Tops" },
  { id: "bottom-1", category: "Bottoms" },
  { id: "shoe-1", category: "Shoes" },
  { id: "dress-1", category: "Dresses" },
];

test("outfit validation removes invented and duplicate item IDs", () => {
  const filtered = filterCompleteOutfits([
    { title: "Complete", itemIds: ["top-1", "bottom-1", "shoe-1", "shoe-1"] },
    { title: "Invented reference", itemIds: ["top-1", "bottom-1", "does-not-exist"] },
    { title: "Incomplete", itemIds: ["top-1", "shoe-1"] },
  ], coreWardrobe);

  assert.equal(filtered.length, 1);
  assert.deepEqual(filtered[0].itemIds, ["top-1", "bottom-1", "shoe-1"]);
});

test("a dress and footwear is accepted as a complete occasion outfit", () => {
  const filtered = filterCompleteOutfits([
    { title: "Dress look", itemIds: ["dress-1", "shoe-1"] },
  ], coreWardrobe);

  assert.equal(filtered.length, 1);
});

test("a complete top-and-bottom outfit is accepted when the wardrobe has no shoes", () => {
  const filtered = filterCompleteOutfits([
    { title: "At-home look", itemIds: ["top-1", "bottom-1"] },
  ], coreWardrobe.filter(item => item.category !== "Shoes"));

  assert.equal(filtered.length, 1);
});

test("shopping gaps do not require purchases when the user has a dress and shoes", () => {
  assert.deepEqual(getPotentialShoppingGaps(["Dresses", "Shoes"], "Birthday"), []);
});

test("shopping gaps treat a dress as an alternative to tops and bottoms", () => {
  assert.deepEqual(getPotentialShoppingGaps(["Tops", "Shoes"], "Birthday"), ["Bottoms", "Dresses"]);
});

test("outdoor events mention a missing layer without inventing forecast conditions", () => {
  assert.deepEqual(
    getPotentialShoppingGaps(["Tops", "Bottoms", "Shoes"], "Outdoor event"),
    ["Outerwear"],
  );
});

test("gym guidance flags activewear when it is missing", () => {
  assert.deepEqual(
    getPotentialShoppingGaps(["Tops", "Bottoms", "Shoes"], "Gym or active"),
    ["Activewear"],
  );
});

test("a price that is unknown cannot be presented as inside a specified budget", () => {
  assert.equal(isWithinBudget({ category: "Shoes", currency: "KES", price: null }, "2000"), false);
  assert.equal(isWithinBudget({ category: "Shoes", currency: "KES", price: 1800 }, "2000"), true);
  assert.equal(isWithinBudget({ category: "Shoes", currency: "KES", price: 2800 }, "2000"), false);
  assert.equal(isWithinBudget({ category: "Shoes", currency: "KES", price: null }, ""), true);
});

test("shop gap matching respects category, currency, and budget", () => {
  const products = [
    { id: "in-budget", category: "Shoes", currency: "KES", price: 1800 },
    { id: "over-budget", category: "Shoes", currency: "KES", price: 2800 },
    { id: "unknown-price", category: "Shoes", currency: "KES", price: null },
    { id: "wrong-category", category: "Bags", currency: "KES", price: 1500 },
    { id: "wrong-currency", category: "Shoes", currency: "USD", price: 10 },
  ];
  const filtered = filterProductsForGaps(products, ["Shoes"], "2000");
  assert.deepEqual(filtered.map(product => product.id), ["in-budget"]);
});
