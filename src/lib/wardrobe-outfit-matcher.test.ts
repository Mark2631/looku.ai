import { describe, it, expect } from "vitest";
import { matchWardrobeOutfits } from "./wardrobe-outfit-matcher";
const item = (id: string, category: string, status = "available") => ({ id, name: id, category, colors: ["navy"], formality: 5, is_owned: true, status });
describe("wardrobe matcher", () => {
  it("uses only real owned and available garments", () => {
    const looks = matchWardrobeOutfits([item("tee","Tops"), item("jeans","Bottoms"),item("shoes","Shoes"),item("wash","Accessories","laundry")],"Birthday");
    expect(looks.length).toBe(1);
    expect(looks[0].itemIds).toEqual(["tee","jeans","shoes"]);
    expect(looks[0].itemIds).not.toContain("wash");
  });
  it("requires a real complete base", () => {
    expect(matchWardrobeOutfits([item("tee","Tops"),item("shoes","Shoes")],"Birthday")).toEqual([]);
  });
  it("uses swimsuits only in swim occasions", () => {
    const clothes=[item("swim","Swimwear"), item("sandals","Shoes")];
    expect(matchWardrobeOutfits(clothes,"Beach or pool day")[0].itemIds).toContain("swim");
    expect(matchWardrobeOutfits(clothes,"Job interview")).toEqual([]);
  });
  it("does not require shoes if the user has no shoes uploaded", () => {
    const looks=matchWardrobeOutfits([item("tee","Tops"),item("jeans","Bottoms")],"Campus");
    expect(looks.length).toBe(1);
    expect(looks[0].itemIds).toEqual(["tee","jeans"]);
  });
  it("ranks explicitly liked pieces above otherwise similar alternatives", () => {
    const clothes=[item("liked-top","Tops"),item("other-top","Tops"),item("jeans","Bottoms"),item("shoes","Shoes")];
    const looks=matchWardrobeOutfits(clothes,"Birthday",2,[],["liked-top"],[]);
    expect(looks[0].itemIds).toContain("liked-top");
  });
  it("downranks garments in the avoided colors list", () => {
    const a={...item("red-top","Tops"),colors:["red"]};
    const b={...item("blue-top","Tops"),colors:["blue"]};
    const looks=matchWardrobeOutfits([a,b,item("jeans","Bottoms"),item("shoes","Shoes")],"Campus",2,[],[],[],["red"]);
    expect(looks[0].itemIds).toContain("blue-top");
  });
  it("shows different outfit types before repeating similar separates combinations", () => {
    const clothes=[
      item("tee","Tops"),
      item("jeans","Bottoms"),
      item("second-bottom","Bottoms"),
      item("dress","Dresses"),
      item("shoes","Shoes"),
    ];
    const looks=matchWardrobeOutfits(clothes,"Campus",3);
    expect(looks).toHaveLength(3);
    expect(looks.some(look=>look.itemIds.includes("dress"))).toBe(true);
    expect(new Set(looks.map(look=>look.itemIds.includes("dress") ? "dress" : "separates")).size).toBe(2);
  });
  it("returns at most three unique combinations", () => {
    const clothes=[item("a","Tops"),item("b","Tops"),item("c","Bottoms"),item("d","Shoes")];
    const looks=matchWardrobeOutfits(clothes,"Birthday",3);
    expect(looks.length).toBe(2);
    expect(new Set(looks.map(l=>l.itemIds.join("|"))).size).toBe(2);
  });
});