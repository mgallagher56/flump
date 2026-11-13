export const SETTINGS_TABS = ["profile", "security", "data"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export const SETTINGS_TAB_ITEMS: ReadonlyArray<{ value: SettingsTab; label: string }> = [
  { value: "profile", label: "Profile" },
  { value: "security", label: "Security" },
  { value: "data", label: "Data" },
];

/**
 * The settings tab named by `?tab=`, or null for anything unknown. The old names
 * (`profile_security`, `ai_connections`) still work so existing links and bookmarks keep landing
 * in the right place.
 */
export const parseSettingsTab = (search: string): SettingsTab | null => {
  const tab = new URLSearchParams(search).get("tab");
  if (tab === "profile" || tab === "profile_security") return "profile";
  if (tab === "security" || tab === "ai_connections") return "security";
  if (tab === "data") return "data";
  return null;
};
