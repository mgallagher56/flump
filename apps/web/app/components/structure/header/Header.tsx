import { HomeLogo, ThemeToggle, TopBar } from "@repo/ui";
import { type FC, type ReactElement, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useRouteLoaderData } from "react-router";
import AvatarMenu from "~/components/navigation/AvatarMenu";
import { buildNavManifest, findActiveNavKey } from "~/components/navigation/buildNavManifest";
import { isSandboxPath } from "~/components/navigation/navConfig";
import { renderHomeLogoLink } from "~/components/navigation/renderHomeLogoLink";
import { createRenderNavLink } from "~/components/navigation/renderNavLink";
import UserLogin from "~/components/navigation/UserLogin";
import { useResponsive } from "~/context/ResponsiveContext";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/root";
import { useThemeContext } from "~/ThemeContext";
import { isPageEnabled } from "~/utils/pageConfig";

import { compactOnly, wideOnly } from "./Header.styles";
import MobileNavDrawer from "./MobileNavDrawer";

export interface HeaderProps {
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

const Header: FC<HeaderProps> = ({ isMobile: propIsMobile, variant }): ReactElement<FC> => {
  // Read by route id so the header sees the root loader's user from any route, including the root
  // error boundary after a page below it failed. Undefined only when the root loader itself
  // failed, and then the header renders signed out.
  const user = useRouteLoaderData<typeof loader>("root")?.user ?? null;
  const { profile } = useUserProfile();
  const { pathname } = useLocation();
  const sandbox = !user && isSandboxPath(pathname);
  // Below the nav breakpoint (phones) the top bar always keeps its menu button, beside the bottom
  // bar where that shows (owner ruling 2026-11-14): both open the same drawer.
  const { isMobile: contextIsMobile, isMobileDrawerOpen, setMobileDrawerOpen } = useResponsive();
  const [localDrawerOpen, setLocalDrawerOpen] = useState(false);

  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);
  const drawerOpen = isMobileDrawerOpen || localDrawerOpen;

  const { t } = useTranslation();
  const { preference, setPreference } = useThemeContext();
  const items = useMemo(
    () =>
      buildNavManifest({
        signedIn: !!user,
        sandbox,
        enabledPages: profile.enabledPages || [],
        isPageEnabled,
        t,
      }),
    [user, sandbox, profile.enabledPages, t],
  );
  const renderLink = useMemo(() => createRenderNavLink(), []);

  // One open state for both openers (this menu button and the bottom bar's More).
  const handleToggleDrawer = () => {
    const next = !drawerOpen;
    setMobileDrawerOpen(next);
    setLocalDrawerOpen(next);
  };

  const handleCloseDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
    setLocalDrawerOpen(false);
  }, [setMobileDrawerOpen]);

  return (
    <>
      <TopBar
        actions={
          <>
            {/* Phones and tablets: one 44px button. From navWide the three-way switch shows. */}
            <ThemeToggle
              className={compactOnly()}
              id="theme-toggle-compact"
              onChange={setPreference}
              preference={preference}
              variant="cycle"
            />
            <div className={wideOnly()}>
              <ThemeToggle onChange={setPreference} preference={preference} />
            </div>
            {!!user && <AvatarMenu user={user} />}
            {!user && <UserLogin signUp={sandbox ? "never" : "fromSm"} />}
          </>
        }
        activeKey={findActiveNavKey(items, pathname)}
        items={items}
        logo={<HomeLogo decorative={!isMobileVariant} renderLink={renderHomeLogoLink} />}
        menuControls="mobile-nav-drawer"
        menuExpanded={drawerOpen}
        menuLabel="Open navigation menu"
        navLabel="Primary"
        renderLink={renderLink}
        onMenuClick={handleToggleDrawer}
      />
      <MobileNavDrawer
        isOpen={drawerOpen}
        sandbox={sandbox}
        user={user}
        onClose={handleCloseDrawer}
      />
    </>
  );
};

export default Header;
