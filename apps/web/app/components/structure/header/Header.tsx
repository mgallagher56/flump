import { css } from "@repo/ui/styled-system/css";
import { type FC, type ReactElement, useMemo, useState } from "react";
import {
  FaBars,
  FaBuilding,
  FaChartLine,
  FaFileInvoiceDollar,
  FaPiggyBank,
  FaShieldAlt,
} from "react-icons/fa";
import { Link, useLoaderData } from "react-router";
import FLPBox from "~/components/core/structure/FLPBox";
import HomeLogo from "~/components/navigation/HomeLogo";
import NavMenu, { type NavRouteItem } from "~/components/navigation/NavMenu";
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
} from "./styles";

export interface HeaderProps {
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

export const AUTH_DESKTOP_NAV_ROUTES: NavRouteItem[] = [
  { key: "debt", route: "/app/debt" },
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
  const { profile } = useUserProfile();
  const {
    isMobile: contextIsMobile,
    isMobileDrawerOpen,
    setMobileDrawerOpen,
    toggleMobileDrawer,
  } = useResponsive();
  const [localDrawerOpen, setLocalDrawerOpen] = useState(false);

  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);
  const drawerOpen = isMobileDrawerOpen || localDrawerOpen;

  const filteredAuthRoutes = useMemo(() => {
    const enabled = profile.enabledPages || [];
    return AUTH_DESKTOP_NAV_ROUTES.map((item) => {
      if (item.children) {
        const filteredChildren = item.children.filter((child) =>
          isPageEnabled(enabled, child.key as any),
        );
        return {
          ...item,
          children: filteredChildren,
        };
      }
      return item;
    }).filter((item) => {
      if (item.children) {
        return item.children.length > 0;
      }
      return isPageEnabled(enabled, item.key as any);
    });
  }, [profile.enabledPages]);

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
        <nav className={navStyles}>
          <FLPBox className={menuStyles}>
            <HomeLogo />
            {!isMobileVariant && (
              <div className={desktopMenuLinksStyles}>
                <NavMenu routes={[{ key: "home", route: "/" }]} />
                {!!user && <NavMenu routes={filteredAuthRoutes} />}
              </div>
            )}
          </FLPBox>
          <FLPBox className={loginStyles}>
            <ThemeToggle />
            {!!user && (
              <Link
                aria-label="User Profile"
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "full",
                  outline: "none",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": { transform: "scale(1.05)" },
                  "&:focus-visible": {
                    boxShadow: "0 0 0 2px token(colors.primary)",
                  },
                })}
                title="User Profile"
                to="/app/profile"
              >
                <UserAvatar bordered size={26} user={user} />
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
      </header>
      <MobileNavDrawer isOpen={drawerOpen} user={user} onClose={handleCloseDrawer} />
    </>
  );
};

export default Header;
