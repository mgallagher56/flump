import { Icon } from "@repo/ui";
import { Ellipsis, PiggyBank, Scale, TrendingDown, Wallet } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { useResponsive } from "~/context/ResponsiveContext";
import { useUserProfile } from "~/hooks/useUserProfile";
import { isPageEnabled } from "~/utils/pageConfig";
import { bar, tab } from "./MobileBottomBar.styles";

export interface MobileBottomBarProps {
  user?: unknown;
  isMobile?: boolean;
  onMoreClick?: () => void;
}

const MobileBottomBar: FC<MobileBottomBarProps> = ({ user, isMobile, onMoreClick }) => {
  const { t } = useTranslation();
  const { toggleMobileDrawer, isMobileDrawerOpen } = useResponsive();
  const { profile } = useUserProfile();

  if (!user) return null;

  const handleMore = onMoreClick || toggleMobileDrawer;
  const enabled = profile.enabledPages || [];

  // Four primary tabs plus More. Tax is opt-in and lives in the More drawer.
  const rawTabs = [
    { key: "budget", label: t("budget", "Budget"), to: "/app/budget", icon: Wallet },
    { key: "debt", label: t("debt", "Debt"), to: "/app/debt", icon: TrendingDown },
    { key: "savings", label: t("savings", "Savings"), to: "/app/savings", icon: PiggyBank },
    { key: "accounts", label: t("accounts", "Accounts"), to: "/app/accounts", icon: Scale },
  ] as const;

  const tabs = rawTabs.filter((entry) => isPageEnabled(enabled, entry.key));

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className={bar({ forceMobile: Boolean(isMobile) })}
      data-testid="mobile-bottom-bar"
      id="mobile-bottom-bar"
    >
      {tabs.map((item) => (
        <NavLink
          key={item.key}
          className={({ isActive }) => tab({ active: isActive })}
          end={item.to === "/app/accounts"}
          to={item.to}
        >
          <Icon icon={item.icon} />
          <span>{item.label}</span>
        </NavLink>
      ))}
      <button
        aria-expanded={isMobileDrawerOpen}
        aria-label="More navigation options"
        className={tab({ active: isMobileDrawerOpen })}
        data-testid="mobile-bottom-bar-more"
        id="mobile-bottom-bar-more"
        type="button"
        onClick={handleMore}
      >
        <Icon icon={Ellipsis} />
        <span>{t("more", "More")}</span>
      </button>
    </nav>
  );
};

export default MobileBottomBar;
