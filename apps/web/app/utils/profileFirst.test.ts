// @vitest-environment node
import { describe, expect, it } from "vitest";
import { salaryProfileFirst } from "./profileFirst";

const saved = (fields: Record<string, unknown>) => ({ id: "profile-1", ...fields });

// Audit slice 8: only the saved profile counts; no browser baseline stands in for it.
describe("salaryProfileFirst", () => {
  it("reads the saved salary, numbers or numeric text", () => {
    expect(salaryProfileFirst(saved({ annualSalary: 52000 }))).toBe(52000);
    expect(salaryProfileFirst(saved({ annualSalary: "52000.00" }))).toBe(52000);
  });

  it("keeps a saved 0 as a real value", () => {
    expect(salaryProfileFirst(saved({ annualSalary: 0 }))).toBe(0);
  });

  it("is not known (null) when no salary is saved or there is no profile", () => {
    expect(salaryProfileFirst(saved({ annualSalary: null }))).toBeNull();
    expect(salaryProfileFirst(saved({}))).toBeNull();
    expect(salaryProfileFirst(null)).toBeNull();
    expect(salaryProfileFirst(undefined)).toBeNull();
  });
});
