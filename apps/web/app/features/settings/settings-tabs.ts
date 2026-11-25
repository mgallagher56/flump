const SETTINGS_TABS = ["profile", "security", "data", "household"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

const BASE_TAB_ITEMS: ReadonlyArray<{ value: SettingsTab; label: string }> = [
  { value: "profile", label: "Profile" },
  { value: "security", label: "Security" },
  { value: "data", label: "Data" },
];

/**
 * The tabs to show. Household (E34 C3) is added only when the settings loader's GET /household
 * succeeded; the web holds no flag of its own, so a 404 or any failure means no tab.
 */
export const settingsTabItems = (
  householdAvailable: boolean,
): ReadonlyArray<{ value: SettingsTab; label: string }> =>
  householdAvailable
    ? [...BASE_TAB_ITEMS, { value: "household", label: "Household" }]
    : BASE_TAB_ITEMS;

/**
 * The settings tab named by `?tab=`, or null for anything unknown. The old names
 * (`profile_security`, `ai_connections`) still work so existing links and bookmarks keep landing
 * in the right place. `household` is known only when the tab is available; otherwise it is treated
 * like any unknown name.
 */
export const parseSettingsTab = (
  search: string,
  options: { householdAvailable?: boolean } = {},
): SettingsTab | null => {
  const tab = new URLSearchParams(search).get("tab");
  if (tab === "profile" || tab === "profile_security") return "profile";
  if (tab === "security" || tab === "ai_connections") return "security";
  if (tab === "data") return "data";
  if (tab === "household" && options.householdAvailable === true) return "household";
  return null;
};
