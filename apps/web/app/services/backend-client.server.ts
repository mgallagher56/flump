import type { LoaderFunctionArgs } from "react-router";
import { getAuthSession } from "~/utils/utils";

export interface WorkspaceSnapshot {
  user: any;
  accessToken?: string;
  accounts: any[];
  accountDetails: any[];
  userProfile: any | null;
  budgetEntries: any[];
  taxRecords: any[];
  bankConnections: any[];
}

export interface WorkspaceFetchOptions {
  includeBudget?: boolean;
  includeTax?: boolean;
  includeConnections?: boolean;
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
  } = options;

  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn });

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

  const [accounts, accountDetails, userProfile, budgetEntries, taxRecords, bankConnections] =
    await Promise.all([
      fetchJson<any[]>("/accounts", []),
      fetchJson<any[]>("/account-details", []),
      fetchJson<any | null>("/user-profile", null),
      includeBudget ? fetchJson<any[]>("/budget-entries", []) : Promise.resolve([]),
      includeTax ? fetchJson<any[]>("/tax-records", []) : Promise.resolve([]),
      includeConnections ? fetchJson<any[]>("/bank-connections", []) : Promise.resolve([]),
    ]);

  return {
    user,
    accessToken,
    accounts,
    accountDetails,
    userProfile,
    budgetEntries,
    taxRecords,
    bankConnections,
  };
}
