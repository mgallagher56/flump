export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: "checking" | "savings" | "credit_card" | "investment" | "other";
  balance: number;
  currency: string;
  createdAt: string;
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

export interface ApiError {
  message: string;
  statusCode: number;
}
