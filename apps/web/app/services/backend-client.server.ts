import type { LoaderFunctionArgs } from "react-router";
import { getAuthSession } from "~/utils/utils";

export interface PortfolioSnapshotData {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  totalLiquidCash: number;
  totalInvestments: number;
  totalPensions: number;
  totalConsumerDebt: number;
  totalMortgageBalance: number;
  resolvedAccounts: any[];
  monthlyHistory: any[];
  currency: string;
}

export interface WorkspaceSnapshot {
  user: any;
  accessToken?: string;
  accounts: any[];
  accountDetails: any[];
  portfolioSnapshot: PortfolioSnapshotData | null;
  userProfile: any | null;
  budgetEntries: any[];
  taxRecords: any[];
  bankConnections: any[];
}

export interface WorkspaceFetchOptions {
  includeBudget?: boolean;
  includeTax?: boolean;
  includeConnections?: boolean;
  includePortfolioSnapshot?: boolean;
  ensureSignedIn?: boolean;
}

/**
 * Canonical server loader helper for fetching Flump workspace data.
 * Unifies auth headers, parallel fetching, error handling, and default fallbacks across routes.
 */
export async function loadWorkspaceSnapshot(
  args: LoaderFunctionArgs,
  options: WorkspaceFetchOptions = {},
): Promise<WorkspaceSnapshot> {
  const {
    ensureSignedIn = true,
    includeBudget = false,
    includeTax = false,
    includeConnections = false,
    includePortfolioSnapshot = false,
  } = options;

  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn });

  if (!user) {
    return {
      user: null,
      accessToken,
      accounts: [],
      accountDetails: [],
      portfolioSnapshot: null,
      userProfile: null,
      budgetEntries: [],
      taxRecords: [],
      bankConnections: [],
    };
  }

  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
  const headers = { Authorization: `Bearer ${accessToken || "mock-session-token"}` };

  const fetchJson = async <T>(endpoint: string, fallback: T): Promise<T> => {
    try {
      const res = await fetch(`${apiUrl}${endpoint}`, { headers });
      if (!res.ok) return fallback;
      return (await res.json()) as T;
    } catch {
      return fallback;
    }
  };

  const [
    accounts,
    rawAccountDetails,
    userProfile,
    budgetEntries,
    taxRecords,
    bankConnections,
    portfolioSnapshot,
  ] = await Promise.all([
    fetchJson<any[]>("/accounts", []),
    fetchJson<any[]>("/account-details", []),
    fetchJson<any | null>("/user-profile", null),
    includeBudget ? fetchJson<any[]>("/budget-entries", []) : Promise.resolve([]),
    includeTax ? fetchJson<any[]>("/tax-records", []) : Promise.resolve([]),
    includeConnections ? fetchJson<any[]>("/bank-connections", []) : Promise.resolve([]),
    includePortfolioSnapshot
      ? fetchJson<PortfolioSnapshotData | null>("/portfolio-snapshot", null)
      : Promise.resolve(null),
  ]);

  const accountDetails =
    rawAccountDetails && rawAccountDetails.length > 0
      ? rawAccountDetails
      : accounts.flatMap((a) => a.details || []);

  return {
    user,
    accessToken,
    accounts,
    accountDetails,
    portfolioSnapshot,
    userProfile,
    budgetEntries,
    taxRecords,
    bankConnections,
  };
}
