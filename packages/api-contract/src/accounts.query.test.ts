import { describe, expect, it } from "vitest";
import { ACCOUNT_DETAILS_OPTIONS, AccountListQuery } from "./domains/accounts.js";
import { routes } from "./manifest.js";

/**
 * System audit slice 9 (DB-12 item 1): `GET /accounts` takes a `details` option so a loader asks
 * only for the history it shows. Leaving it out keeps today's answer (every month), so no caller
 * breaks.
 */
describe("GET /accounts details option", () => {
  it("offers none, latest and all", () => {
    expect([...ACCOUNT_DETAILS_OPTIONS]).toEqual(["none", "latest", "all"]);
  });

  it("accepts each option alongside the paging fields, and no option at all", () => {
    for (const details of ACCOUNT_DETAILS_OPTIONS) {
      expect(AccountListQuery.safeParse({ details, limit: "10" }).success, details).toBe(true);
    }
    expect(AccountListQuery.safeParse({}).success).toBe(true);
  });

  it("refuses any other value and any unknown field", () => {
    expect(AccountListQuery.safeParse({ details: "some" }).success).toBe(false);
    expect(AccountListQuery.safeParse({ details: "" }).success).toBe(false);
    expect(AccountListQuery.safeParse({ months: "3" }).success).toBe(false);
  });

  it("is the query the accounts list route declares", () => {
    expect(routes.accounts.list.query).toBe(AccountListQuery);
  });
});
