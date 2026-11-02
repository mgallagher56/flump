import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaBuilding,
  FaChartLine,
  FaCoins,
  FaFileInvoiceDollar,
  FaHome,
  FaPiggyBank,
  FaTimes,
  FaUniversity,
  FaWallet,
} from "react-icons/fa";
import { Link } from "react-router";
import HomeLogo from "~/components/navigation/HomeLogo";
import NavMenu, { type NavRouteItem } from "~/components/navigation/NavMenu";
import ThemeToggle from "~/components/navigation/ThemeToggle";
import UserAvatar from "~/components/navigation/UserAvatar";
import UserLogin from "~/components/navigation/UserLogin";

export interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user?: unknown;
}

const backdropStyle = css({
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.55)",
  backdropFilter: "blur(4px)",
  zIndex: 90,
});

const drawerStyle = css({
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  height: "100vh",
  maxHeight: "100dvh",
  width: "85%",
  maxWidth: "320px",
  backgroundColor: "surface",
  borderLeft: "1px solid",
  borderColor: "border",
  zIndex: 100,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: "20px 16px",
  boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.25)",
  overflowY: "auto",
});

const drawerHeaderStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: "16px",
  marginBottom: "16px",
  borderBottom: "1px solid",
  borderColor: "border",
});

const closeBtnStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "44px",
  height: "44px",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "background",
  color: "text.primary",
  cursor: "pointer",
  transition: "all 0.2s ease",
  _hover: {
    borderColor: "primary",
    color: "primary",
  },
});

const footerStyle = css({
  marginTop: "24px",
  paddingTop: "16px",
  borderTop: "1px solid",
  borderColor: "border",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

const profileLinkStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 16px",
  borderRadius: "lg",
  color: "text.primary",
  textDecoration: "none",
  fontWeight: "medium",
  fontSize: "15px",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "background",
  transition: "all 0.2s ease",
  _hover: {
    borderColor: "primary",
    color: "primary",
  },
});

const MobileNavDrawer: FC<MobileNavDrawerProps> = ({ isOpen, onClose, user }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;

  const baseRoutes: NavRouteItem[] = [{ key: "home", route: "/", icon: <FaHome size={18} /> }];

  const authRoutes: NavRouteItem[] = user
    ? [
        { key: "budget", route: "/app/budget", icon: <FaWallet size={18} /> },
        { key: "accounts", route: "/app/accounts", icon: <FaUniversity size={18} /> },
        {
          key: "wealth",
          children: [
            { key: "savings", route: "/app/savings", icon: <FaPiggyBank size={18} /> },
            { key: "pension", route: "/app/pension", icon: <FaCoins size={18} /> },
            { key: "mortgage", route: "/app/mortgage", icon: <FaBuilding size={18} /> },
          ],
        },
        {
          key: "planning",
          children: [
            { key: "forecast", route: "/app/forecast", icon: <FaChartLine size={18} /> },
            { key: "tax", route: "/app/tax", icon: <FaFileInvoiceDollar size={18} /> },
          ],
        },
      ]
    : [];

  const drawerContent = (
    <>
      <div
        aria-hidden="true"
        className={backdropStyle}
        data-testid="mobile-drawer-backdrop"
        id="mobile-drawer-backdrop"
        onClick={onClose}
      />
      <aside
        aria-label="Mobile Navigation Drawer"
        className={drawerStyle}
        data-testid="mobile-nav-drawer"
        id="mobile-nav-drawer"
      >
        <div>
          <div className={drawerHeaderStyle}>
            <HomeLogo />
            <button
              aria-label="Close navigation menu"
              className={closeBtnStyle}
              type="button"
              onClick={onClose}
            >
              <FaTimes size={18} />
            </button>
          </div>
          <NavMenu
            isMobile
            routes={[...baseRoutes, ...authRoutes]}
            variant="mobile"
            onNavigate={onClose}
          />
        </div>

        <div className={footerStyle}>
          {!!user && (
            <Link className={profileLinkStyle} to="/app/profile" onClick={onClose}>
              <UserAvatar bordered size={24} user={user} />
              <span>User Profile</span>
            </Link>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <ThemeToggle />
            <UserLogin />
          </div>
        </div>
      </aside>
    </>
  );

  if (mounted && typeof document !== "undefined") {
    return createPortal(drawerContent, document.body);
  }

  return drawerContent;
};

export default MobileNavDrawer;
