import { PageBody, PageHeader, Tabs } from "@repo/ui";
import { type FC, useEffect, useState } from "react";
import { useLocation } from "react-router";
import { DataTab } from "~/features/settings/components/DataTab";
import { ProfileTab } from "~/features/settings/components/ProfileTab";
import { SecurityTab } from "~/features/settings/components/SecurityTab";
import {
  parseSettingsTab,
  SETTINGS_TAB_ITEMS,
  type SettingsTab,
} from "~/features/settings/settings-tabs";
import { type UserProfile, useUserProfile } from "~/hooks/useUserProfile";

export interface SettingsPageProps {
  /** The profile from the route loader. */
  initialProfile: UserProfile;
  /** The public AI connections page (marketing `/mcp#setup`), for the Security tab's steps. */
  aiGuideUrl?: string;
  /** The signed-in auth user. */
  user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    user_metadata?: Record<string, string>;
  } | null;
}

/**
 * Settings (E15 T3.10, E16 PR 9, R2-9): Profile, Security and Data tabs in the standard page width,
 * with no hero. The email shows once, on the Security tab. Every change on the Profile tab saves
 * straight away, so there is no save button and nothing unsaved to guard when switching tabs.
 */
export const SettingsPage: FC<SettingsPageProps> = ({ initialProfile, user, aiGuideUrl }) => {
  const { profile } = useUserProfile();
  const effectiveProfile = profile.id ? profile : initialProfile;
  const email = user?.email || effectiveProfile.email;

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  // Deep link from the account menu (?tab=security). Read after mount so SSR markup matches.
  let search = "";
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: fallback when rendered outside Router in unit tests
    search = useLocation().search;
  } catch {
    search = typeof window !== "undefined" ? window.location.search : "";
  }
  useEffect(() => {
    const tab = parseSettingsTab(search);
    if (tab) setActiveTab(tab);
  }, [search]);

  return (
    <PageBody id="settings-page" data-testid="settings-page">
      <PageHeader title="Settings" description="Your details, how you sign in and your data." />

      <Tabs
        activationMode="manual"
        aria-label="Settings sections"
        items={[...SETTINGS_TAB_ITEMS]}
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as SettingsTab)}
      >
        <Tabs.Panel value="profile">
          <ProfileTab key={effectiveProfile.id} profile={effectiveProfile} user={user} />
        </Tabs.Panel>
        <Tabs.Panel value="security">
          <SecurityTab email={email} guideUrl={aiGuideUrl} />
        </Tabs.Panel>
        <Tabs.Panel value="data">
          <DataTab />
        </Tabs.Panel>
      </Tabs>
    </PageBody>
  );
};
