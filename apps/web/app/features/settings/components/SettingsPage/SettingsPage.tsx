import type { NetWorthChoicesAvailable } from "@flump/finance-engine";
import { PageBody, PageHeader, Tabs } from "@repo/ui";
import { type FC, useEffect, useState } from "react";
import { useLocation } from "react-router";
import { HouseholdTab } from "~/features/household/components/HouseholdTab";
import type { HouseholdSettingsData } from "~/features/household/household";
import { DataTab } from "~/features/settings/components/DataTab";
import { ProfileTab } from "~/features/settings/components/ProfileTab";
import { SecurityTab } from "~/features/settings/components/SecurityTab";
import {
  parseSettingsTab,
  type SettingsTab,
  settingsTabItems,
} from "~/features/settings/settings-tabs";
import { type UserProfile, useUserProfile } from "~/hooks/useUserProfile";
import { headerAndTabs } from "./SettingsPage.styles";

export interface SettingsPageProps {
  /** The profile from the route loader. */
  initialProfile: UserProfile;
  /** The public AI connections page (marketing `/features/ai-connection#setup`), for the Security tab's steps. */
  aiGuideUrl?: string;
  /** The address an AI assistant connects to (the backend's `/mcp`). */
  mcpServerUrl?: string;
  /** Which net worth choices apply to the user's accounts; null when they could not be read. */
  netWorthChoices?: NetWorthChoicesAvailable | null;
  /** True for a beta admin: the Security tab links to the invites page. */
  isBetaAdmin?: boolean;
  /**
   * The household state from the loader (E34 C3). Null or absent when GET /household did not
   * succeed: then there is no Household tab and `?tab=household` is an unknown tab.
   */
  household?: HouseholdSettingsData | null;
  /**
   * The tab to open first, chosen by the loader from `?tab=` so the first HTML already shows it
   * (the household join flow lands on `?tab=household`). Profile when absent.
   */
  initialTab?: SettingsTab;
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
export const SettingsPage: FC<SettingsPageProps> = ({
  initialProfile,
  user,
  aiGuideUrl,
  mcpServerUrl,
  netWorthChoices,
  isBetaAdmin = false,
  household = null,
  initialTab = "profile",
}) => {
  const householdAvailable = household !== null;
  const { profile } = useUserProfile();
  const effectiveProfile = profile.id ? profile : initialProfile;
  const email = user?.email || effectiveProfile.email;

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  // A later change of `?tab=` on the client (the account menu's link to ?tab=security) switches
  // tab; the first render uses the loader's choice, so the server and client markup match.
  let search = "";
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: fallback when rendered outside Router in unit tests
    search = useLocation().search;
  } catch {
    search = typeof window !== "undefined" ? window.location.search : "";
  }
  useEffect(() => {
    const tab = parseSettingsTab(search, { householdAvailable });
    if (tab) setActiveTab(tab);
  }, [search, householdAvailable]);

  return (
    <PageBody id="settings-page" data-testid="settings-page">
      <div className={headerAndTabs()}>
        <PageHeader title="Settings" description="Your details, how you sign in and your data." />

        <Tabs
          activationMode="manual"
          aria-label="Settings sections"
          items={[...settingsTabItems(householdAvailable)]}
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as SettingsTab)}
        >
          <Tabs.Panel value="profile">
            <ProfileTab
              key={effectiveProfile.id}
              netWorthChoices={netWorthChoices}
              profile={effectiveProfile}
              user={user}
            />
          </Tabs.Panel>
          <Tabs.Panel value="security">
            <SecurityTab
              email={email}
              guideUrl={aiGuideUrl}
              isBetaAdmin={isBetaAdmin}
              serverUrl={mcpServerUrl}
            />
          </Tabs.Panel>
          <Tabs.Panel value="data">
            <DataTab />
          </Tabs.Panel>
          {household ? (
            <Tabs.Panel value="household">
              <HouseholdTab data={household} />
            </Tabs.Panel>
          ) : null}
        </Tabs>
      </div>
    </PageBody>
  );
};
