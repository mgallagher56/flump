/**
 * The one query key factory (plan section 4.5). Every key starts with `flump`, so sign-out can drop
 * the whole cache in one call, and each `/v1` read has one key, so a write invalidates exactly what
 * it changed.
 */
const all = ["flump"] as const;

export const queryKeys = {
  all,
  accounts: () => [...all, "accounts"] as const,
  accountDetails: () => [...all, "account-details"] as const,
  userProfile: () => [...all, "user-profile"] as const,
  /** Not in offline cache: resolved on demand by SettingsSecurity only. */
  userEmail: () => [...all, "user-email"] as const,
  checkIns: () => [...all, "snapshots", "check-ins"] as const,
  budgetEntries: () => [...all, "budget-entries"] as const,
};
