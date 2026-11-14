import { HomeLogo, ThemeToggle, TopBar } from "@repo/ui";
import { type FC, type ReactElement, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLoaderData, useLocation } from "react-router";
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

import MobileNavDrawer from "./MobileNavDrawer";

export interface HeaderProps {
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

const Header: FC<HeaderProps> = ({ isMobile: propIsMobile, variant }): ReactElement<FC> => {
  const { user } = useLoaderData<typeof loader>();
  const { profile } = useUserProfile();
  const { pathname } = useLocation();
  const sandbox = !user && isSandboxPath(pathname);
  const {
    isMobile: contextIsMobile,
    isMobileDrawerOpen,
    setMobileDrawerOpen,
    toggleMobileDrawer,
  } = useResponsive();
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

  const handleToggleDrawer = () => {
    toggleMobileDrawer();
    setLocalDrawerOpen((prev) => !prev);
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
            {!!user && <AvatarMenu user={user} />}
            {!user && <UserLogin />}
          </>
        }
        activeKey={findActiveNavKey(items, pathname)}
        inlineActions={<ThemeToggle onChange={setPreference} preference={preference} />}
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
