import { Icon } from "@repo/ui";
import { Ellipsis, Lock } from "lucide-react";
import { type FC, useId } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { useResponsive } from "~/context/ResponsiveContext";
import { BOTTOM_BAR_TABS, SANDBOX_ROUTE } from "../navConfig";
import { bar, lockIcon, srOnly, tab } from "./MobileBottomBar.styles";

export interface MobileBottomBarProps {
  user?: unknown;
  isMobile?: boolean;
  onMoreClick?: () => void;
  /** Signed-out sandbox: same tabs, but only Home (the sandbox) is live; the rest read "Sign up to open". */
  sandbox?: boolean;
}

const MobileBottomBar: FC<MobileBottomBarProps> = ({ user, isMobile, onMoreClick, sandbox }) => {
  const { t } = useTranslation();
  const { toggleMobileDrawer, isMobileDrawerOpen } = useResponsive();
  const hintId = useId();

  if (!user && !sandbox) return null;

  const handleMore = onMoreClick || toggleMobileDrawer;

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className={bar({ forceMobile: Boolean(isMobile) })}
      data-testid="mobile-bottom-bar"
      id="mobile-bottom-bar"
    >
      {sandbox ? (
        <span className={srOnly()} id={hintId}>
          {t("signUpToOpen", "Sign up to open")}
        </span>
      ) : null}
      {BOTTOM_BAR_TABS.map((item) => {
        const label = t(item.key, item.label);
        if (sandbox && item.key !== "home") {
          return (
            <button
              key={item.key}
              aria-describedby={hintId}
              aria-disabled="true"
              className={tab({ active: false, locked: true })}
              data-testid={`mobile-bottom-bar-${item.key}-disabled`}
              id={`mobile-bottom-bar-${item.key}-disabled`}
              type="button"
              onClick={(event) => event.preventDefault()}
            >
              <Icon icon={item.icon} />
              <span>{label}</span>
              <Icon className={lockIcon()} icon={Lock} size="sm" />
            </button>
          );
        }
        const to = sandbox ? SANDBOX_ROUTE : item.to;
        return (
          <NavLink
            key={item.key}
            className={({ isActive }) => tab({ active: isActive })}
            end={to === "/app/accounts" || to === "/" || to === SANDBOX_ROUTE}
            to={to}
          >
            <Icon icon={item.icon} />
            <span>{label}</span>
          </NavLink>
        );
      })}
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
