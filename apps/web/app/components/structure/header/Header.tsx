import { css } from "@repo/ui/styled-system/css";
import { type FC, type ReactElement, useState } from "react";
import { FaBars, FaUserCircle } from "react-icons/fa";
import { Link, useLoaderData } from "react-router";
import FLPBox from "~/components/core/structure/FLPBox";
import HomeLogo from "~/components/navigation/HomeLogo";
import NavMenu from "~/components/navigation/NavMenu";
import ThemeToggle from "~/components/navigation/ThemeToggle";
import UserLogin from "~/components/navigation/UserLogin";
import { useResponsive } from "~/context/ResponsiveContext";
import type { loader } from "~/root";

import MobileNavDrawer from "./MobileNavDrawer";
import {
  desktopMenuLinksStyles,
  headerStyles,
  loginStyles,
  menuStyles,
  mobileMenuButtonStyles,
  navStyles,
} from "./styles";

export interface HeaderProps {
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

const Header: FC<HeaderProps> = ({ isMobile: propIsMobile, variant }): ReactElement<FC> => {
  const { user } = useLoaderData<typeof loader>();
  const {
    isMobile: contextIsMobile,
    isMobileDrawerOpen,
    setMobileDrawerOpen,
    toggleMobileDrawer,
  } = useResponsive();
  const [localDrawerOpen, setLocalDrawerOpen] = useState(false);

  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);
  const drawerOpen = isMobileDrawerOpen || localDrawerOpen;

  const handleToggleDrawer = () => {
    toggleMobileDrawer();
    setLocalDrawerOpen((prev) => !prev);
  };

  const handleCloseDrawer = () => {
    setMobileDrawerOpen(false);
    setLocalDrawerOpen(false);
  };

  return (
    <header className={headerStyles}>
      <nav className={navStyles}>
        <FLPBox className={menuStyles}>
          <HomeLogo />
          {!isMobileVariant && (
            <div className={desktopMenuLinksStyles}>
              <NavMenu routes={[{ key: "home", route: "/" }]} />
              {!!user && (
                <NavMenu
                  routes={[
                    { key: "budget", route: "/app/budget" },
                    { key: "savings", route: "/app/savings" },
                    { key: "pension", route: "/app/pension" },
                    { key: "accounts", route: "/app/accounts" },
                    { key: "forecast", route: "/app/forecast" },
                    { key: "mortgage", route: "/app/mortgage" },
                    { key: "tax", route: "/app/tax" },
                  ]}
                />
              )}
            </div>
          )}
        </FLPBox>
        <FLPBox className={loginStyles}>
          <ThemeToggle />
          {!!user && (
            <Link
              to="/app/profile"
              className={css({
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.muted",
                transition: "color 0.2s",
                "&:hover": { color: "primary" },
              })}
              title="User Profile"
            >
              <FaUserCircle size={22} />
            </Link>
          )}
          {!isMobileVariant && <UserLogin />}
          <button
            aria-expanded={drawerOpen}
            aria-label="Open navigation menu"
            className={mobileMenuButtonStyles}
            data-testid="mobile-menu-toggle"
            style={isMobileVariant ? { display: "inline-flex" } : undefined}
            type="button"
            onClick={handleToggleDrawer}
          >
            <FaBars size={18} />
          </button>
        </FLPBox>
      </nav>
      <MobileNavDrawer isOpen={drawerOpen} user={user} onClose={handleCloseDrawer} />
    </header>
  );
};

export default Header;
