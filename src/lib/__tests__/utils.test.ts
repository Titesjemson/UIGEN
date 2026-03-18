import { describe, test, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  test("returns a single class unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  test("merges multiple classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  test("ignores falsy values", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
  });

  test("handles conditional object syntax", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
  });

  test("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  test("resolves mixed Tailwind conflicts", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  test("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});
