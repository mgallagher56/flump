import { describe, expect, it } from "vitest";
import { propertyShareProfileFirst, salaryProfileFirst, seededProfile } from "./profileFirst";

const saved = (fields: { annualSalary?: unknown; propertyOwnershipShare?: unknown }) => ({
  id: "profile-1",
  ...fields,
});

describe("salaryProfileFirst", () => {
  it("uses the saved salary over a stale baseline salary", () => {
    expect(salaryProfileFirst(saved({ annualSalary: 52000 }), 30000)).toBe(52000);
    expect(salaryProfileFirst(saved({ annualSalary: "52000.00" }), 30000)).toBe(52000);
  });

  it("keeps a saved 0 as the saved figure", () => {
    expect(salaryProfileFirst(saved({ annualSalary: 0 }), 30000)).toBe(0);
  });

  it("reads a cleared salary on a saved profile as not known (null), never the baseline or 0", () => {
    expect(salaryProfileFirst(saved({ annualSalary: null }), 30000)).toBeNull();
    expect(salaryProfileFirst(saved({}), 30000)).toBeNull();
  });

  it("falls back to the baseline only when there is no profile row", () => {
    expect(salaryProfileFirst(null, 30000)).toBe(30000);
    expect(salaryProfileFirst(undefined, 30000)).toBe(30000);
    // The client atom before seeding: an empty id is no profile row.
    expect(salaryProfileFirst({ id: "", annualSalary: null }, 30000)).toBe(30000);
    // No profile and no baseline: not known.
    expect(salaryProfileFirst(null, 0)).toBeNull();
    expect(salaryProfileFirst(null)).toBeNull();
  });
});

describe("propertyShareProfileFirst", () => {
  it("uses the saved share over the baseline share", () => {
    expect(propertyShareProfileFirst(saved({ propertyOwnershipShare: 100 }), 50)).toBe(100);
    expect(propertyShareProfileFirst(saved({ propertyOwnershipShare: "40" }), 50)).toBe(40);
  });

  it("reads a cleared share on a saved profile as 100, never the baseline", () => {
    expect(propertyShareProfileFirst(saved({ propertyOwnershipShare: null }), 50)).toBe(100);
  });

  it("falls back to the baseline with no profile row, then 100", () => {
    expect(propertyShareProfileFirst(null, 50)).toBe(50);
    expect(propertyShareProfileFirst({ id: "" }, 50)).toBe(50);
    expect(propertyShareProfileFirst(undefined, undefined)).toBe(100);
  });
});

describe("seededProfile", () => {
  const loader = { id: "profile-1", pensionPercent: 6 };

  it("uses the loader profile while the atom still has the default empty id", () => {
    const atom = { id: "", pensionPercent: 5 };
    expect(seededProfile(atom, loader)).toBe(loader);
  });

  it("uses the atom once it holds the same profile as the loader", () => {
    const atom = { id: "profile-1", pensionPercent: 8 };
    expect(seededProfile(atom, loader)).toBe(atom);
  });

  it("uses the loader profile when the atom holds a different profile", () => {
    const atom = { id: "profile-2", pensionPercent: 8 };
    expect(seededProfile(atom, loader)).toBe(loader);
  });

  it("uses the atom when there is no loader profile", () => {
    const atom = { id: "", pensionPercent: 5 };
    expect(seededProfile(atom, null)).toBe(atom);
    expect(seededProfile(atom, undefined)).toBe(atom);
  });
});
