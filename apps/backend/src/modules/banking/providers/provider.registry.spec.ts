import { describe, expect, it } from "vitest";
import type { MonzoProvider } from "./monzo.provider";
import { OPEN_BANKING_INSTITUTIONS } from "./open-banking-standard.provider";
import { BankProviderRegistry } from "./provider.registry";
import type { StarlingProvider } from "./starling.provider";
import type { Trading212Provider } from "./trading212.provider";

describe("BankProviderRegistry", () => {
  const monzo = { id: "monzo" } as unknown as MonzoProvider;
  const starling = { id: "starling" } as unknown as StarlingProvider;
  const t212 = { id: "trading212" } as unknown as Trading212Provider;
  const registry = new BankProviderRegistry(monzo, starling, t212);

  it("returns registered custom providers case-insensitively", () => {
    expect(registry.getProvider("Monzo")).toBe(monzo);
    expect(registry.getProvider("STARLING")).toBe(starling);
    expect(registry.getProvider("trading212")).toBe(t212);
  });

  it("registers open banking institutions", () => {
    for (const key of Object.keys(OPEN_BANKING_INSTITUTIONS)) {
      expect(registry.hasProvider(key)).toBe(true);
    }
  });

  it("handles unknown providers", () => {
    expect(registry.hasProvider("nope")).toBe(false);
    expect(registry.getProvider("nope")).toBeUndefined();
  });

  it("lists all supported institutions", () => {
    const all = registry.getAllSupportedInstitutions();
    expect(all).toContain("monzo");
    expect(all).toContain("starling");
    expect(all).toContain("trading212");
    expect(all.length).toBe(3 + Object.keys(OPEN_BANKING_INSTITUTIONS).length);
  });
});
