import type { Database } from "db_types";
import type { AccountType } from "./utils";

export type Account = Omit<Partial<Database["public"]["Tables"]["accounts"]["Row"]>, "type"> & {
  type?: AccountType;
  balance?: number;
  interestRate?: number | null;
  monthlyContribution?: number | null;
};
export type AccountDetail = Partial<Database["public"]["Tables"]["account_details"]["Row"]>;
