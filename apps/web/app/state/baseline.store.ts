/**
 * Browser keys of the retired financial baseline. Signed-in pages read saved figures from loader
 * data only (audit slice 8), so nothing writes these any more. A browser may still hold one from
 * an earlier version, so sign-out and reset keep clearing them (`USER_STORAGE_KEYS`).
 */
export const FINANCIAL_BASELINE_STORAGE_KEY = "flump_financial_baseline_v2";
export const LEGACY_BASELINE_STORAGE_KEYS = ["flump_financial_baseline_v1"];
