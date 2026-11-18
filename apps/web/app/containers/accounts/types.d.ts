import type { Database } from "db_types";
import type { AccountType } from "./utils";

export type Account = Omit<Partial<Database["public"]["Tables"]["accounts"]["Row"]>, "type"> & {
  type?: AccountType;
  accountSubtype?: string | null;
  balance?: number;
  interestRate?: number | null;
  monthlyContribution?: number | null;
  creditLimit?: number | null;
  promoZeroPercentUntil?: string | null;
  /** Mortgage term in months (1..600), or null when not set. */
  termMonths?: number | null;
  /** End of the fixed-rate period as an ISO date (YYYY-MM-DD), or null when not set. */
  fixedRateEndDate?: string | null;
  isCurrent?: boolean;
  /** "sole" or "joint", as the backend stores it. */
  ownership?: string | null;
  /** The user's share of a joint account, 1 to 100, or null for a sole account. */
  sharePercent?: number | null;
};
export type AccountDetail = Partial<Database["public"]["Tables"]["account_details"]["Row"]>;
