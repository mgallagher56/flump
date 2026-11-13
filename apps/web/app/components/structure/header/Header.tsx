import { Icon } from "@repo/ui";
import { Menu } from "lucide-react";
import { type FC, type ReactElement, useMemo, useState } from "react";
import { Link, useLoaderData, useLocation } from "react-router";
import FLPBox from "~/components/core/structure/FLPBox";
import HomeLogo from "~/components/navigation/HomeLogo";
import NavMenu from "~/components/navigation/NavMenu";
import {
  AUTH_NAV_ROUTES,
  filterNavRoutes,
  HOME_NAV_ROUTE,
  isSandboxPath,
} from "~/components/navigation/navConfig";
import ThemeToggle from "~/components/navigation/ThemeToggle";
import UserAvatar from "~/components/navigation/UserAvatar";
import UserLogin from "~/components/navigation/UserLogin";
import { useResponsive } from "~/context/ResponsiveContext";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/root";
import { isPageEnabled } from "~/utils/pageConfig";

import MobileNavDrawer from "./MobileNavDrawer";
import {
  desktopMenuLinksStyles,
  headerStyles,
  loginStyles,
  menuStyles,
  mobileMenuButtonStyles,
  navStyles,
  profileLink,
  srOnly,
} from "./styles";

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

  const filteredAuthRoutes = useMemo(
    () => filterNavRoutes(AUTH_NAV_ROUTES, profile.enabledPages || [], isPageEnabled),
    [profile.enabledPages],
  );

  const handleToggleDrawer = () => {
    toggleMobileDrawer();
    setLocalDrawerOpen((prev) => !prev);
  };

  const handleCloseDrawer = () => {
    setMobileDrawerOpen(false);
    setLocalDrawerOpen(false);
  };

  return (
    <>
      <header className={headerStyles}>
        <nav aria-label="Primary" className={navStyles}>
          <FLPBox className={menuStyles}>
            <HomeLogo decorative={!isMobileVariant} />
            {!isMobileVariant && (
              <div className={desktopMenuLinksStyles}>
                <NavMenu routes={[HOME_NAV_ROUTE]} />
                {!!user && <NavMenu routes={filteredAuthRoutes} />}
              </div>
            )}
          </FLPBox>
          <FLPBox className={loginStyles}>
            <ThemeToggle />
            {!!user && (
              <Link className={profileLink} title="Settings" to="/app/profile">
                <span aria-hidden="true">
                  <UserAvatar bordered size={26} user={user} />
                </span>
                <span className={srOnly}>Settings</span>
              </Link>
            )}
            <UserLogin />
            <button
              aria-controls="mobile-nav-drawer"
              aria-expanded={drawerOpen}
              aria-haspopup="dialog"
              aria-label="Open navigation menu"
              className={mobileMenuButtonStyles}
              data-testid="mobile-menu-toggle"
              id="mobile-menu-toggle"
              data-mobile={isMobileVariant ? "true" : undefined}
              type="button"
              onClick={handleToggleDrawer}
            >
              <Icon icon={Menu} />
            </button>
          </FLPBox>
        </nav>
      </header>
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
