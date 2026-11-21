// @vitest-environment node
import { describe, expect, it } from "vitest";
import { salaryProfileFirst } from "./profileFirst";

describe("salaryProfileFirst with blank text", () => {
  it("treats a salary of only spaces as not known, not £0", () => {
    expect(salaryProfileFirst({ id: "profile-1", annualSalary: "   " })).toBeNull();
  });
});
