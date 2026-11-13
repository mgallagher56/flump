import { PageHeader, SegmentedTabs } from "@repo/ui";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import UserAvatar from "~/components/navigation/UserAvatar";
import { DataTab } from "~/features/settings/components/DataTab";
import { ProfileTab } from "~/features/settings/components/ProfileTab";
import { SecurityTab } from "~/features/settings/components/SecurityTab";
import { UnsavedChangesDialog } from "~/features/settings/components/UnsavedChangesDialog";
import { useUnsavedChangesGuard } from "~/features/settings/hooks/useUnsavedChangesGuard";
import {
  parseSettingsTab,
  SETTINGS_TAB_ITEMS,
  type SettingsTab,
} from "~/features/settings/settings-tabs";
import { type UserProfile, useUserProfile } from "~/hooks/useUserProfile";
import { hero, heroEmail, heroEyebrow, heroName, heroText, root } from "./SettingsPage.styles";

export interface SettingsPageProps {
  /** The profile from the route loader. */
  initialProfile: UserProfile;
  /** The signed-in auth user. */
  user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    user_metadata?: Record<string, string>;
  } | null;
}

const heroDisplayName = (profile: UserProfile, email: string | null | undefined) => {
  const full = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  return full || email || "Your account";
};

/**
 * Settings (E15 T3.10): who you are, Profile, Security and Data tabs. Each tab owns its own
 * actions, and the Profile tab has its own save with an unsaved-changes guard.
 */
export const SettingsPage: FC<SettingsPageProps> = ({ initialProfile, user }) => {
  const { profile } = useUserProfile();
  const effectiveProfile = profile.id ? profile : initialProfile;
  const email = user?.email || effectiveProfile.email;

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profileDirty, setProfileDirty] = useState(false);
  const { blocked, guard, proceed, stay } = useUnsavedChangesGuard(profileDirty);

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  // True while the held change came from a `?tab=` link rather than a tab click.
  const heldFromUrl = useRef(false);

  const changeTab = useCallback(
    (next: SettingsTab, fromUrl = false) => {
      if (next === activeTabRef.current) return;
      heldFromUrl.current = fromUrl;
      guard(() => {
        heldFromUrl.current = false;
        setProfileDirty(false);
        setActiveTab(next);
      });
    },
    [guard],
  );
  const changeTabRef = useRef(changeTab);
  changeTabRef.current = changeTab;

  let navigate: ((to: string, options?: { replace?: boolean }) => void) | null = null;
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: fallback when rendered outside Router in unit tests
    navigate = useNavigate();
  } catch {
    navigate = null;
  }

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
    if (tab) changeTabRef.current(tab, true);
  }, [search]);

  const keepEditing = () => {
    stay();
    // The URL asked for another tab but the person stayed: put `?tab=` back to where they are.
    if (heldFromUrl.current) {
      heldFromUrl.current = false;
      const url = `?tab=${activeTabRef.current}`;
      if (navigate) navigate(url, { replace: true });
      else if (typeof window !== "undefined") window.history.replaceState(null, "", url);
    }
  };

  return (
    <div className={root()} id="settings-page" data-testid="settings-page">
      <PageHeader
        title="Your settings"
        description="Your details, how you sign in and your data."
      />

      <section
        aria-labelledby="settings-hero-name"
        className={hero()}
        data-testid="settings-hero"
        id="settings-hero"
      >
        <UserAvatar bordered profile={effectiveProfile} size={64} user={user} />
        <div className={heroText()}>
          <p className={heroEyebrow()}>Signed in as</p>
          <h2 className={heroName()} id="settings-hero-name">
            {heroDisplayName(effectiveProfile, email)}
          </h2>
          {email ? <p className={heroEmail()}>{email}</p> : null}
        </div>
      </section>

      <SegmentedTabs
        activationMode="manual"
        aria-label="Settings sections"
        items={[...SETTINGS_TAB_ITEMS]}
        value={activeTab}
        onValueChange={(value) => changeTab(value as SettingsTab)}
      >
        <SegmentedTabs.Panel value="profile">
          <ProfileTab
            key={effectiveProfile.id}
            profile={effectiveProfile}
            user={user}
            onDirtyChange={setProfileDirty}
          />
        </SegmentedTabs.Panel>
        <SegmentedTabs.Panel value="security">
          <SecurityTab email={email} />
        </SegmentedTabs.Panel>
        <SegmentedTabs.Panel value="data">
          <DataTab />
        </SegmentedTabs.Panel>
      </SegmentedTabs>

      <UnsavedChangesDialog open={blocked} onDiscard={proceed} onKeepEditing={keepEditing} />
    </div>
  );
};
