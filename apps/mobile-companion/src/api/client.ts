import { Platform } from "react-native";
import type {
  Account,
  AccountDetail,
  BankConnection,
  BudgetEntry,
  Transaction,
  UserProfile,
} from "../types";

// For Android Emulator, localhost is 10.0.2.2. For iOS, it is localhost.
const getBackendUrl = () => {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000";
  }
  return "http://localhost:4000";
};

const BACKEND_URL = getBackendUrl();
const TOKEN = "mock-session-token";

// In-memory mock storage fallback when the backend is unreachable
let mockAccounts: Account[] = [
  {
    id: "acc-checking",
    userId: "dev_user_123",
    name: "Main Checking",
    type: "Current",
    balance: 2450.75,
    currency: "GBP",
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-savings",
    userId: "dev_user_123",
    name: "High Yield Savings",
    type: "Saving",
    balance: 15800.0,
    currency: "GBP",
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-invest",
    userId: "dev_user_123",
    name: "Investment Portfolio",
    type: "Investment",
    balance: 42100.5,
    currency: "GBP",
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-mortgage",
    userId: "dev_user_123",
    name: "Home Mortgage",
    type: "Mortgage",
    balance: -142800.0,
    currency: "GBP",
    createdAt: new Date().toISOString(),
  },
];

let mockAccountDetails: AccountDetail[] = [];
const mockTransactions: Transaction[] = [
  {
    id: "tx-1",
    accountId: "acc-checking",
    userId: "dev_user_123",
    amount: -12.5,
    description: "Uber Eats",
    category: "Food",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "tx-2",
    accountId: "acc-checking",
    userId: "dev_user_123",
    amount: 3200.0,
    description: "Monthly Salary Acme Corp",
    category: "Salary",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: "tx-3",
    accountId: "acc-checking",
    userId: "dev_user_123",
    amount: -45.0,
    description: "Shell Petrol Station",
    category: "Transport",
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: "tx-4",
    accountId: "acc-savings",
    userId: "dev_user_123",
    amount: 150.0,
    description: "Monthly Interest",
    category: "Interest",
    timestamp: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
];

let mockBankConnections: BankConnection[] = [];

let mockUserProfile: UserProfile = {
  id: "prof-dev",
  userId: "dev_user_123",
  displayName: "Dev User",
  currency: "GBP",
  country: "GB",
  employmentType: "employed",
  annualSalary: 45000,
  monthlyTakeHome: 2800,
  hasSecondIncome: false,
  secondIncomeMonthly: null,
  hasRentalIncome: false,
  rentalIncomeMonthly: null,
  hasMortgage: true,
  pensionPercent: 5,
  isSalarySacrifice: true,
  setupChecklistCompletedSteps: ["accounts"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockBudgetEntries: BudgetEntry[] = [
  {
    id: "b-rent",
    userId: "dev_user_123",
    category: "housing",
    name: "Rent / Mortgage",
    amount: 1200,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    notes: "Direct debit",
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "b-electricity",
    userId: "dev_user_123",
    category: "bills",
    name: "Electricity",
    amount: 80,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    notes: "Direct debit",
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "b-salary",
    userId: "dev_user_123",
    category: "income",
    name: "Salary (Take Home)",
    amount: 3000,
    frequency: "monthly",
    isIncome: true,
    isPrimaryIncome: true,
    isEssential: true,
    notes: "Acme Corp",
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Helper to seed 12 months of mock history if mock details are empty
const seedMockDetails = () => {
  if (mockAccountDetails.length > 0) return;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  let idCounter = 1;

  for (const acc of mockAccounts) {
    for (let i = 0; i < 12; i++) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      const multiplier = 1 - i * 0.015;
      const historyValue = Math.round(acc.balance * multiplier * 100) / 100;

      mockAccountDetails.push({
        id: idCounter++,
        accountId: acc.id,
        month: m,
        year: y,
        value: historyValue,
      });
    }
  }
};

seedMockDetails();

let useMockFallback = false;

// Wrapper helper for API fetches with dynamic fallback
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BACKEND_URL}/${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TOKEN}`,
    ...(options.headers || {}),
  };

  if (useMockFallback) {
    throw new Error("Using cached mock fallback mode");
  }

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.warn(`API call failed for ${endpoint}, switching to mock fallback:`, error);
    useMockFallback = true;
    throw error;
  }
}

export const api = {
  isMockMode: () => useMockFallback,
  setMockMode: (val: boolean) => {
    useMockFallback = val;
  },

  async getAccounts(): Promise<Account[]> {
    try {
      return await apiFetch<Account[]>("accounts");
    } catch {
      return mockAccounts;
    }
  },

  async getAccountDetails(): Promise<AccountDetail[]> {
    try {
      return await apiFetch<AccountDetail[]>("account-details");
    } catch {
      return mockAccountDetails;
    }
  },

  async getTransactions(): Promise<Transaction[]> {
    try {
      return await apiFetch<Transaction[]>("transactions");
    } catch {
      return mockTransactions;
    }
  },

  async getBankConnections(): Promise<BankConnection[]> {
    try {
      return await apiFetch<BankConnection[]>("bank-connections");
    } catch {
      return mockBankConnections;
    }
  },

  async connectBank(institutionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiFetch<any>("bank-connections", {
        method: "POST",
        body: JSON.stringify({ institutionId }),
      });
      return { success: true, message: res.message || "Connected successfully" };
    } catch {
      // Mock flow
      const names: { [key: string]: string } = {
        hsbc: "HSBC Bank",
        barclays: "Barclays Bank",
        monzo: "Monzo Bank (Demo)",
        revolut: "Revolut (Demo)",
        chase: "Chase (Demo)",
        starling: "Starling Bank (Demo)",
      };
      const name = names[institutionId] || "External Bank (Demo)";

      // Check if connection exists
      let conn = mockBankConnections.find((c) => c.institutionId === institutionId);
      if (!conn) {
        conn = {
          id: `conn-${Date.now()}`,
          userId: "dev_user_123",
          institutionId,
          institutionName: name,
          status: "connected",
          authType: "oauth",
          lastSyncedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        mockBankConnections.push(conn);

        // Seed some new accounts for this bank connection
        const newAcc: Account = {
          id: `acc-bank-${Date.now()}`,
          userId: "dev_user_123",
          name: `${name} Current`,
          type: "Current",
          balance: Math.round((Math.random() * 5000 + 1000) * 100) / 100,
          currency: "GBP",
          connectionId: conn.id,
          createdAt: new Date().toISOString(),
        };
        mockAccounts.push(newAcc);

        // seed details for this new account
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        for (let i = 0; i < 12; i++) {
          let m = currentMonth - i;
          let y = currentYear;
          if (m <= 0) {
            m += 12;
            y -= 1;
          }
          mockAccountDetails.push({
            id: Math.round(Math.random() * 100000),
            accountId: newAcc.id,
            month: m,
            year: y,
            value: Math.round(newAcc.balance * (1 - i * 0.01) * 100) / 100,
          });
        }
      } else {
        conn.status = "connected";
        conn.lastSyncedAt = new Date().toISOString();
      }

      return { success: true, message: `Connected to ${name} successfully!` };
    }
  },

  async refreshBank(connectionId: string): Promise<{ success: boolean }> {
    try {
      await apiFetch<any>(`bank-connections/${connectionId}/refresh`, {
        method: "POST",
      });
      return { success: true };
    } catch {
      const conn = mockBankConnections.find((c) => c.id === connectionId);
      if (conn) {
        conn.status = "connected";
        conn.lastSyncedAt = new Date().toISOString();
      }
      return { success: true };
    }
  },

  async deleteBankConnection(connectionId: string): Promise<{ success: boolean }> {
    try {
      await apiFetch<any>(`bank-connections/${connectionId}`, {
        method: "DELETE",
      });
      return { success: true };
    } catch {
      mockBankConnections = mockBankConnections.filter((c) => c.id !== connectionId);
      mockAccounts = mockAccounts.filter((a) => a.connectionId !== connectionId);
      return { success: true };
    }
  },

  async addManualAccount(name: string, type: Account["type"], balance: number): Promise<Account> {
    try {
      return await apiFetch<Account>("accounts", {
        method: "POST",
        body: JSON.stringify({ name, type, balance, currency: "GBP" }),
      });
    } catch {
      const newAcc: Account = {
        id: `acc-manual-${Date.now()}`,
        userId: "dev_user_123",
        name,
        type,
        balance,
        currency: "GBP",
        createdAt: new Date().toISOString(),
      };
      mockAccounts.push(newAcc);

      // Seed 12 months history
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      for (let i = 0; i < 12; i++) {
        let m = currentMonth - i;
        let y = currentYear;
        if (m <= 0) {
          m += 12;
          y -= 1;
        }
        mockAccountDetails.push({
          id: Math.round(Math.random() * 100000),
          accountId: newAcc.id,
          month: m,
          year: y,
          value: Math.round(balance * (1 - i * 0.015) * 100) / 100,
        });
      }
      return newAcc;
    }
  },

  async deleteAccount(accountId: string): Promise<{ success: boolean }> {
    try {
      await apiFetch<any>(`accounts/${accountId}`, {
        method: "DELETE",
      });
      return { success: true };
    } catch {
      mockAccounts = mockAccounts.filter((a) => a.id !== accountId);
      mockAccountDetails = mockAccountDetails.filter((d) => d.accountId !== accountId);
      return { success: true };
    }
  },

  async addAccountDetail(
    accountId: string,
    month: number,
    year: number,
    value: number,
  ): Promise<AccountDetail> {
    try {
      return await apiFetch<AccountDetail>(`accounts/${accountId}/details`, {
        method: "POST",
        body: JSON.stringify({ month, year, value }),
      });
    } catch {
      // Update balance on account
      const acc = mockAccounts.find((a) => a.id === accountId);
      if (acc) {
        acc.balance = value;
      }
      // Check if detail already exists
      const existing = mockAccountDetails.find(
        (d) => d.accountId === accountId && d.month === month && d.year === year,
      );
      if (existing) {
        existing.value = value;
        return existing;
      } else {
        const newDetail = {
          id: Math.round(Math.random() * 100000),
          accountId,
          month,
          year,
          value,
        };
        mockAccountDetails.push(newDetail);
        return newDetail;
      }
    }
  },

  async getUserProfile(): Promise<UserProfile> {
    try {
      return await apiFetch<UserProfile>("user-profile");
    } catch {
      return mockUserProfile;
    }
  },

  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      return await apiFetch<UserProfile>("user-profile", {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    } catch {
      mockUserProfile = {
        ...mockUserProfile,
        ...updates,
        updatedAt: new Date().toISOString(),
      } as UserProfile;
      return mockUserProfile;
    }
  },

  async getBudgetEntries(): Promise<BudgetEntry[]> {
    try {
      return await apiFetch<BudgetEntry[]>("budget-entries");
    } catch {
      return mockBudgetEntries;
    }
  },
};
