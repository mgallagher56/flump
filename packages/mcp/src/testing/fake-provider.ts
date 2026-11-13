import type { BuildContextPackInput } from "@flump/finance-engine";
import { inMemoryQueries } from "../provider/in-memory.js";
import type { McpUserDataProvider } from "../types.js";

// biome-ignore lint/complexity/noBannedTypes: no options yet; kept so call sites stay stable.
export type FakeProviderOptions = {};

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
  _options: FakeProviderOptions = {},
): FakeProvider {
  const calls: FakeProviderCall[] = [];
  const forUser = async (userId: string) => ({ ...data, baseline: { ...data.baseline, userId } });
  const queries = inMemoryQueries(forUser);
  const provider: FakeProvider = {
    calls,
    async getUserFinancialData(userId, opts) {
      calls.push({ userId, anonymizeInstitutions: opts?.anonymizeInstitutions });
      return forUser(userId);
    },
    ...queries,
  };
  return provider;
}
