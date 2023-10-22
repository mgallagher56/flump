import type { Database } from "db_types";

export type Account = Partial<Database['public']['Tables']['accounts']['Row']>;
