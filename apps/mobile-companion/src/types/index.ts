export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export type AccountType =
  | "Current"
  | "Saving"
  | "Mortgage"
  | "Loan"
  | "Credit Card"
  | "Owed"
  | "Investment";

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  connectionId?: string | null;
  externalAccountId?: string | null;
  createdAt: string;
}

export interface AccountDetail {
  id: number;
  accountId: string;
  month: number;
  year: number;
  value: number;
  createdAt?: string | null;
}

export interface Transaction {
  id: string;
  accountId: string;
  userId: string;
  amount: number; // positive = credit/income, negative = debit/spend
  description: string;
  category: string;
  timestamp: string;
}

export interface BankConnection {
  id: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  status: "connected" | "error" | "disconnected";
  authType: "oauth" | "token";
  lastSyncedAt: string;
  createdAt: string;
}

export interface UKTaxResults {
  gross: number;
  pension: number;
  adjustedGross: number;
  personalAllowance: number;
  incomeTax: number;
  ni: number;
  studentLoan: number;
  netPay: number;
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  currency: string;
  country: string;
  employmentType: "employed" | "self-employed" | "other" | null;
  annualSalary: number | null;
  monthlyTakeHome: number | null;
  hasSecondIncome: boolean;
  secondIncomeMonthly: number | null;
  hasRentalIncome: boolean;
  rentalIncomeMonthly: number | null;
  hasMortgage: boolean;
  propertyOwnershipShare: number | null;
  pensionPercent: number;
  isSalarySacrifice: boolean;
  setupChecklistCompletedSteps: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetEntry {
  id: string;
  userId: string;
  category: "housing" | "bills" | "expenses" | "savings" | "income";
  name: string;
  amount: number;
  frequency: "monthly" | "annual" | "weekly";
  isIncome: boolean;
  isPrimaryIncome: boolean;
  isEssential: boolean;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
