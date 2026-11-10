import type { BuildContextPackInput, FlumpAiContextPack } from "@flump/finance-engine";
import type { VerifiedToken } from "./auth/token-verifier.js";

export interface McpUserDataProvider {
  getUserFinancialData(
    userId: string,
    options?: { anonymizeInstitutions?: boolean },
  ): Promise<BuildContextPackInput>;
  queryTransactions?(
    userId: string,
    filters: {
      accountId?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    },
  ): Promise<
    Array<{
      id: string;
      accountId: string;
      amount: number;
      description: string;
      category: string;
      timestamp: string;
    }>
  >;
}

export interface McpServerContext {
  token: VerifiedToken;
  dataProvider: McpUserDataProvider;
  contextPack?: FlumpAiContextPack;
}
