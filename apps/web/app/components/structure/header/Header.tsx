import { css } from "@repo/ui/styled-system/css";
import { type FC, type ReactElement, useState } from "react";
import {
  FaBars,
  FaBuilding,
  FaChartLine,
  FaFileInvoiceDollar,
  FaPiggyBank,
  FaShieldAlt,
  FaUserCircle,
} from "react-icons/fa";
import { Link, useLoaderData } from "react-router";
import FLPBox from "~/components/core/structure/FLPBox";
import HomeLogo from "~/components/navigation/HomeLogo";
import NavMenu, { type NavRouteItem } from "~/components/navigation/NavMenu";
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

export const AUTH_DESKTOP_NAV_ROUTES: NavRouteItem[] = [
  { key: "budget", route: "/app/budget" },
  { key: "accounts", route: "/app/accounts" },
  {
    key: "wealth",
    children: [
      {
        key: "savings",
        route: "/app/savings",
        description: "navSavingsDesc",
        icon: <FaPiggyBank size={15} />,
        badgeColor: "#10b981",
      },
      {
        key: "pension",
        route: "/app/pension",
        description: "navPensionDesc",
        icon: <FaShieldAlt size={15} />,
        badgeColor: "#8b5cf6",
      },
      {
        key: "mortgage",
        route: "/app/mortgage",
        description: "navMortgageDesc",
        icon: <FaBuilding size={15} />,
        badgeColor: "#f59e0b",
      },
    ],
  },
  {
    key: "planning",
    children: [
      {
        key: "forecast",
        route: "/app/forecast",
        description: "navForecastDesc",
        icon: <FaChartLine size={15} />,
        badgeColor: "#6363f1",
      },
      {
        key: "tax",
        route: "/app/tax",
        description: "navTaxDesc",
        icon: <FaFileInvoiceDollar size={15} />,
        badgeColor: "#3b82f6",
      },
    ],
  },
];

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
              {!!user && <NavMenu routes={AUTH_DESKTOP_NAV_ROUTES} />}
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
            id="mobile-menu-toggle"
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
