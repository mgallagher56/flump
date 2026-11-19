import "reflect-metadata";
import { ACCOUNT_TYPES } from "@flump/api-contract";
import { getMetadataArgsStorage } from "typeorm";
import { describe, expect, it } from "vitest";
import { ACCOUNT_TYPES_AT_1795510100000 } from "../migrations/AccountTypeCheck1795510100000";
import { Account } from "./account.entity";

/**
 * System audit slice 9: the database check on `accounts.type`, the entity's copy of it (so a
 * synchronize-built database keeps it) and the API contract's list name the same eleven types.
 * A new account type needs a migration that widens the check, and this test says so.
 */
describe("CHK_accounts_type", () => {
  const typesIn = (expression: string): string[] =>
    [...expression.matchAll(/'([^']+)'/g)].map((m) => m[1] as string);

  it("the entity's check lists exactly the contract's account types", () => {
    const check = getMetadataArgsStorage().checks.find(
      (c) => c.target === Account && c.name === "CHK_accounts_type",
    );
    expect(check).toBeDefined();
    expect(typesIn(check?.expression ?? "").sort()).toEqual([...ACCOUNT_TYPES].sort());
  });

  it("the migration's frozen list is the contract's list", () => {
    expect([...ACCOUNT_TYPES_AT_1795510100000].sort()).toEqual([...ACCOUNT_TYPES].sort());
  });
});
