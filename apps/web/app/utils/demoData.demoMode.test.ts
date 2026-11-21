// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isDemoMode } from "./demoData";

describe("isDemoMode", () => {
  it("is on only when demo=true is in the query", () => {
    expect(isDemoMode("https://flump.test/app?demo=true")).toBe(true);
    expect(isDemoMode("/app?demo=true")).toBe(true);
    expect(isDemoMode(new URL("https://flump.test/app?demo=true"))).toBe(true);
    expect(isDemoMode("https://flump.test/app?demo=1")).toBe(false);
    expect(isDemoMode("https://flump.test/app")).toBe(false);
  });

  it("is off for a URL that cannot be read", () => {
    expect(isDemoMode("http://[not-a-host")).toBe(false);
  });
});
