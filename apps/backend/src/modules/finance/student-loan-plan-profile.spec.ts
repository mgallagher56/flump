import { describe, expect, it } from "vitest";
import { profilePlansAfterAccountWrite } from "./student-loan-plan-profile";

// System audit slice 6 (PP-7, DB-7, L30): the profile is the one home for the student loan plan.
// Saving a Student Loan account with a plan writes it to the profile when the profile has none.
describe("profilePlansAfterAccountWrite", () => {
  it("writes the account's plan into a profile that never answered (null)", () => {
    expect(profilePlansAfterAccountWrite(null, "Student Loan", "PLAN_2")).toEqual(["PLAN_2"]);
  });

  it("writes it into a profile that said no loan ([]): the loan account is the newer answer", () => {
    // FINDINGS PP-7: "no student loan" in onboarding, then a Plan 2 loan account is added.
    expect(profilePlansAfterAccountWrite([], "Student Loan", "PLAN_2")).toEqual(["PLAN_2"]);
  });

  it("leaves a profile that already holds a plan alone, even a different one", () => {
    expect(profilePlansAfterAccountWrite(["PLAN_1"], "Student Loan", "PLAN_2")).toBeUndefined();
    expect(profilePlansAfterAccountWrite(["PLAN_2"], "Student Loan", "PLAN_2")).toBeUndefined();
  });

  it("changes nothing for an account with no plan, or one that is not a student loan", () => {
    expect(profilePlansAfterAccountWrite(null, "Student Loan", null)).toBeUndefined();
    expect(profilePlansAfterAccountWrite(null, "Student Loan", undefined)).toBeUndefined();
    expect(profilePlansAfterAccountWrite(null, "Loan", "PLAN_2")).toBeUndefined();
  });

  it("ignores a plan that is not one of the five codes", () => {
    expect(profilePlansAfterAccountWrite(null, "Student Loan", "PLAN_9")).toBeUndefined();
  });
});
