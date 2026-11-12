import type { BuildContextPackInput } from "@flump/finance-engine";
import type { McpUserDataProvider } from "../types.js";

type Transactions = Awaited<ReturnType<NonNullable<McpUserDataProvider["queryTransactions"]>>>;

export interface FakeProviderOptions {
  transactions?: Transactions;
  /** Omit `queryTransactions` entirely, to model a connection mode without it. */
  withoutTransactions?: boolean;
}

export interface FakeProviderCall {
  userId: string;
  anonymizeInstitutions?: boolean;
}

export type FakeProvider = McpUserDataProvider & { calls: FakeProviderCall[] };

/**
 * Test double for `McpUserDataProvider`. Returns the given data and records every call
 * so tests can assert on the options the server passed.
 */
export function createFakeProvider(
  data: BuildContextPackInput,
  options: FakeProviderOptions = {},
): FakeProvider {
  const calls: FakeProviderCall[] = [];
  const provider: FakeProvider = {
    calls,
    async getUserFinancialData(userId, opts) {
      calls.push({ userId, anonymizeInstitutions: opts?.anonymizeInstitutions });
      return { ...data, baseline: { ...data.baseline, userId } };
    },
  };
  if (!options.withoutTransactions) {
    provider.queryTransactions = async () => options.transactions ?? [];
  }
  return provider;
}
