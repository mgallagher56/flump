import type { Database } from "db_types";

export type Account = Partial<Database["public"]["Tables"]["accounts"]["Row"]> & {
  balance?: number;
};
export type AccountDetail = Partial<Database["public"]["Tables"]["account_details"]["Row"]>;
