import type { Database } from "db_types";
import type { AccountType } from "./utils";

export type Account = Omit<Partial<Database["public"]["Tables"]["accounts"]["Row"]>, "type"> & {
  type?: AccountType;
  balance?: number;
  interestRate?: number | null;
  monthlyContribution?: number | null;
  /** Mortgage term in months (1..600), or null when not set. */
  termMonths?: number | null;
  /** End of the fixed-rate period as an ISO date (YYYY-MM-DD), or null when not set. */
  fixedRateEndDate?: string | null;
  isCurrent?: boolean;
};
export type AccountDetail = Partial<Database["public"]["Tables"]["account_details"]["Row"]>;
