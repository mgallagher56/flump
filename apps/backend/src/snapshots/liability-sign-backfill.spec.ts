import { describe, expect, it } from "vitest";
import {
  describeLiabilitySignPlan,
  LIABILITY_TYPES_AT_MIGRATION,
  LIABILITY_TYPES_SQL,
} from "./liability-sign-backfill";
import { STORED_NEGATIVE_ACCOUNT_TYPES } from "./stored-balance";

describe("liability sign backfill (BE-05)", () => {
  it("freezes the same liability list the write paths use", () => {
    // If this fails, the rule changed: add a migration that re-signs the new type's rows and
    // replaces CHK_accounts_liability_balance_non_positive and the history trigger.
    expect([...LIABILITY_TYPES_AT_MIGRATION]).toEqual([...STORED_NEGATIVE_ACCOUNT_TYPES]);
    expect(LIABILITY_TYPES_SQL).toBe(
      "'Mortgage', 'Credit Card', 'Loan', 'Overdraft', 'Student Loan'",
    );
  });

  it("describes the plan as counts per table and type, never ids or amounts", () => {
    const text = describeLiabilitySignPlan({
      accounts: [
        { type: "Credit Card", rows: 2 },
        { type: "Student Loan", rows: 1 },
      ],
      accountDetails: [{ type: "Credit Card", rows: 7 }],
      users: 2,
    });
    expect(text).toBe(
      [
        "accounts: 3 row(s)",
        "  Credit Card: 2",
        "  Student Loan: 1",
        "account_details: 7 row(s)",
        "  Credit Card: 7",
        "users affected: 2",
      ].join("\n"),
    );
    expect(describeLiabilitySignPlan({ accounts: [], accountDetails: [], users: 0 })).toBe(
      "accounts: 0 row(s)\naccount_details: 0 row(s)\nusers affected: 0",
    );
  });
});
