import type { BuildContextPackInput } from "@flump/finance-engine";
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
  const provider: FakeProvider = {
    calls,
    async getUserFinancialData(userId, opts) {
      calls.push({ userId, anonymizeInstitutions: opts?.anonymizeInstitutions });
      return { ...data, baseline: { ...data.baseline, userId } };
    },
  };
  return provider;
}
