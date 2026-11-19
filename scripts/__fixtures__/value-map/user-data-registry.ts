// Fixture registry for scripts/check-value-map.test.ts. Read as text, never imported.
import { Account } from "./account.entity";

const table = <T>(t: T): T => t;
const WRITTEN_AT = "when the row was written, kept by the database";
const KEYS = { id: "the row's own id", userId: "the owner of the row" };

export const USER_DATA_REGISTRY = [
  table({
    entity: Account,
    key: "accounts",
    valueMap: {
      facts: { name: "account-name", balance: "account-balance" },
      notFacts: { ...KEYS, createdAt: WRITTEN_AT },
    },
  }),
];
