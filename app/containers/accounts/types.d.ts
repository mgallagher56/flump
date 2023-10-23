import type { Database } from 'db_types';

export type Account = Partial<Database['public']['Tables']['accounts']['Row']>;
export type AccountDetail = Partial<Database['public']['Tables']['account_details']['Row']>;
