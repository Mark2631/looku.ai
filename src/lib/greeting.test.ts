import { describe, expect, it } from "vitest";
import { greetingForHour } from "./greeting";
describe("local-time greeting", () => {
  it("greets at night without incorrectly saying morning", () => {
    for (const hour of [17,18,21,23]) expect(greetingForHour(hour)).toBe("Good evening");
  });
  it("greets morning hours correctly", () => {
    for (const hour of [0,6,7,11]) expect(greetingForHour(hour)).toBe("Good morning");
  });
  it("greets afternoons correctly", () => {
    for (const hour of [12,13,16]) expect(greetingForHour(hour)).toBe("Good afternoon");
  });
  it("uses a safe non-time-specific greeting before client hydration", () => {
    expect(greetingForHour(null)).toBe("Welcome back");
    expect(greetingForHour(24)).toBe("Welcome back");
  });
});
