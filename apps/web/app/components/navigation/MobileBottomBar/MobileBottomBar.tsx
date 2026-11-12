import { Icon } from "@repo/ui";
import { Calculator, Ellipsis, House, Scale, Wallet } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { useResponsive } from "~/context/ResponsiveContext";
import { bar, tab } from "./MobileBottomBar.styles";

export interface MobileBottomBarProps {
  user?: unknown;
  isMobile?: boolean;
  onMoreClick?: () => void;
}

const MobileBottomBar: FC<MobileBottomBarProps> = ({ user, isMobile, onMoreClick }) => {
  const { t } = useTranslation();
  const { toggleMobileDrawer, isMobileDrawerOpen } = useResponsive();

  if (!user) return null;

  const handleMore = onMoreClick || toggleMobileDrawer;

  // Home | Accounts | Budget | Tax and pay | More (IA review T-IA-4). All four are always-on pages,
  // so the bar never reflows when modules switch off. Everything else lives in the More drawer.
  const tabs = [
    { key: "home", label: t("home", "Home"), to: "/", icon: House },
    { key: "accounts", label: t("accounts", "Accounts"), to: "/app/accounts", icon: Scale },
    { key: "budget", label: t("budget", "Budget"), to: "/app/budget", icon: Wallet },
    {
      key: "taxAndPay",
      label: t("taxAndPay", "Tax and pay"),
      to: "/app/take-home",
      icon: Calculator,
    },
  ] as const;

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
          end={item.to === "/app/accounts" || item.to === "/"}
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
