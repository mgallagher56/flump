import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  FaEllipsisH,
  FaFileInvoiceDollar,
  FaPiggyBank,
  FaUniversity,
  FaWallet,
} from "react-icons/fa";
import { NavLink } from "react-router";
import { useResponsive } from "~/context/ResponsiveContext";
import { useUserProfile } from "~/hooks/useUserProfile";
import { isPageEnabled } from "~/utils/pageConfig";

export interface MobileBottomBarProps {
  user?: unknown;
  isMobile?: boolean;
  onMoreClick?: () => void;
}

const barStyle = (forceMobile?: boolean) =>
  css({
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 80,
    display: forceMobile ? "flex" : { base: "flex", md: "none" },
    alignItems: "center",
    justifyContent: "space-around",
    height: "64px",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    backgroundColor: {
      base: "rgba(255, 255, 255, 0.9)",
      _dark: "rgba(22, 24, 29, 0.92)",
    },
    backdropFilter: "blur(12px)",
    borderTop: "1px solid",
    borderColor: "border",
    boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.08)",
  });

const tabItemBaseStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  flex: 1,
  height: "100%",
  minHeight: "48px",
  fontSize: "11px",
  fontWeight: "medium",
  textDecoration: "none",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  transition: "color 0.2s ease, transform 0.15s ease",
  color: "text.muted",
  _hover: {
    color: "primary",
  },
});

const activeTabStyle = css({
  color: "primary",
  fontWeight: "semibold",
});

const MobileBottomBar: FC<MobileBottomBarProps> = ({ user, isMobile, onMoreClick }) => {
  const { t } = useTranslation();
  const { toggleMobileDrawer, isMobileDrawerOpen } = useResponsive();
  const { profile } = useUserProfile();

  if (!user) return null;

  const handleMore = onMoreClick || toggleMobileDrawer;
  const enabled = profile.enabledPages || [];

  const rawTabs = [
    {
      key: "budget",
      label: t("budget", "Budget"),
      to: "/app/budget",
      icon: <FaWallet size={18} />,
    },
    {
      key: "savings",
      label: t("savings", "Savings"),
      to: "/app/savings",
      icon: <FaPiggyBank size={18} />,
    },
    {
      key: "accounts",
      label: t("accounts", "Accounts"),
      to: "/app/accounts",
      icon: <FaUniversity size={18} />,
    },
    {
      key: "tax",
      label: t("tax", "Tax"),
      to: "/app/tax",
      icon: <FaFileInvoiceDollar size={18} />,
    },
  ];

  const tabs = rawTabs.filter((tab) => isPageEnabled(enabled, tab.key as any));

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className={barStyle(isMobile)}
      data-testid="mobile-bottom-bar"
      id="mobile-bottom-bar"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          className={({ isActive }) =>
            `${tabItemBaseStyle} ${isActive ? activeTabStyle : ""}`.trim()
          }
          end={tab.to === "/app/accounts"}
          to={tab.to}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </NavLink>
      ))}
      <button
        aria-expanded={isMobileDrawerOpen}
        aria-label="More navigation options"
        className={`${tabItemBaseStyle} ${isMobileDrawerOpen ? activeTabStyle : ""}`.trim()}
        data-testid="mobile-bottom-bar-more"
        id="mobile-bottom-bar-more"
        type="button"
        onClick={handleMore}
      >
        <FaEllipsisH size={18} />
        <span>{t("more", "More")}</span>
      </button>
    </nav>
  );
};

export default MobileBottomBar;
