import { describe, expect, it } from "vitest";
import { colorSchemeConditions, withSystemDark } from "./colorScheme.js";
import { semanticTokens } from "./index.js";

describe("D30: dark mode with JavaScript off", () => {
  it("declares a prefers-color-scheme condition that skips a root set to light", () => {
    expect(colorSchemeConditions.systemDark).toEqual({
      "@media (prefers-color-scheme: dark)": { ":root:not([data-theme='light']) &": "@slot" },
    });
    expect(colorSchemeConditions.dark).toBe(".dark &, [data-theme='dark'] &");
  });

  it("copies every _dark value to _systemDark and leaves other tokens alone", () => {
    const tree = {
      a: { value: { base: "#fff", _dark: "#000" } },
      b: { nested: { value: { base: "1px", _dark: "2px" } } },
      c: { value: "#123456" },
    };
    expect(withSystemDark(tree)).toEqual({
      a: { value: { base: "#fff", _dark: "#000", _systemDark: "#000" } },
      b: { nested: { value: { base: "1px", _dark: "2px", _systemDark: "2px" } } },
      c: { value: "#123456" },
    });
    expect(tree.a.value).not.toHaveProperty("_systemDark");
  });

  it("covers every dark semantic token", () => {
    const count = (node: unknown, key: string): number => {
      if (typeof node !== "object" || node === null) return 0;
      return Object.entries(node).reduce((n, [k, v]) => n + (k === key ? 1 : 0) + count(v, key), 0);
    };
    const out = withSystemDark(semanticTokens);
    expect(count(semanticTokens, "_dark")).toBeGreaterThan(40);
    expect(count(out, "_systemDark")).toBe(count(semanticTokens, "_dark"));
  });
});
