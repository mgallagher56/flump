// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as entry from "./account-form-entry.js";

/** Every module a file reaches through value imports and re-exports (type-only ones are erased). */
function reach(file: string, seen = new Set<string>()): Set<string> {
  if (seen.has(file)) return seen;
  seen.add(file);
  const source = readFileSync(file, "utf8");
  for (const m of source.matchAll(/^(?:import|export)\s+(?!type\b)[^;]*?from\s+"(\.[^"]+)"/gms)) {
    reach(resolve(dirname(file), (m[1] as string).replace(/\.js$/, ".ts")), seen);
  }
  return seen;
}

describe("the account form entry", () => {
  it("reaches no test vector module, so the app bundle carries none", () => {
    const files = [...reach(resolve(__dirname, "account-form-entry.ts"))];
    expect(files.some((f) => f.endsWith("account-form.ts"))).toBe(true);
    expect(files.filter((f) => f.includes("test-vectors"))).toEqual([]);
    expect(files.some((f) => f.endsWith("tax-year-verification.ts"))).toBe(false);
  });

  it("exports what the mobile account forms use", () => {
    for (const name of [
      "accountBalanceShown",
      "accountBalanceStored",
      "accountFieldSet",
      "accountFieldsFromValues",
      "accountFormFromSaved",
      "accountFormNeedsPlan",
      "accountFormToSend",
      "accountFormValues",
      "accountRequestFrom",
      "changedFields",
      "mortgageLinkChoices",
      "newAccountForm",
      "propertyPrefillFor",
      "resolveSharePercent",
      "isOwedAccountType",
      "describeJointLiabilityNotice",
      "describeJointWholeValue",
      "typeChangeFlipsSign",
      "canAccountBeJoint",
      "isBuyToLetAccount",
    ]) {
      expect(typeof (entry as Record<string, unknown>)[name]).toBe("function");
    }
    for (const name of [
      "ACCOUNT_FORM_TYPES",
      "SAVINGS_SUBTYPE_OPTIONS",
      "INVESTMENT_SUBTYPE_OPTIONS",
      "MORTGAGE_SUBTYPE_OPTIONS",
      "PROPERTY_SUBTYPE_OPTIONS",
      "LOAN_SUBTYPE_OPTIONS",
      "MORTGAGE_REPAYMENT_OPTIONS",
      "STUDENT_LOAN_PLAN_OPTIONS",
      "OWNERSHIP_OPTIONS",
    ]) {
      expect(Array.isArray((entry as Record<string, unknown>)[name])).toBe(true);
    }
    expect(entry.ACCOUNT_SUBTYPE_LABEL.cash_isa).toBe("Cash ISA");
    expect(entry.DEFAULT_JOINT_SHARE_PERCENT).toBe(50);
  });
});
