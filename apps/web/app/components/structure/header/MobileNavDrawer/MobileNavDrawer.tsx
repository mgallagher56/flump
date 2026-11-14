import { buttonVariants, HomeLogo, Icon, NavDrawer } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { Calculator, Settings, Sparkles } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import NavMenu from "~/components/navigation/NavMenu";
import { mobileLink } from "~/components/navigation/NavMenu/NavMenu.styles";
import {
  AUTH_NAV_ROUTES,
  BOTTOM_BAR_TABS,
  CONNECT_AI_ROUTE,
  filterNavRoutes,
  HOME_NAV_ROUTE,
  type NavRouteItem,
} from "~/components/navigation/navConfig";
import { renderHomeLogoLink } from "~/components/navigation/renderHomeLogoLink";
import UserLogin from "~/components/navigation/UserLogin";
import { useUserProfile } from "~/hooks/useUserProfile";
import { isPageEnabled } from "~/utils/pageConfig";
import { footerRow, signUpLink } from "./MobileNavDrawer.styles";

export interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user?: unknown;
  /** Signed-out sandbox: list the same tabs, with everything but Home disabled ("Sign up to open"). */
  sandbox?: boolean;
}

// Every destination in the signed-in nav needs an account, so the sandbox disables exactly these.
const SANDBOX_DISABLED_KEYS = new Set(
  AUTH_NAV_ROUTES.flatMap((route) => (route.children ? route.children : [route]).map((r) => r.key)),
);

/** Settings, Connect AI and Calculators use the same row as the pages above them. */
const footerLinkClass = cx(buttonVariants({ variant: "ghost" }), mobileLink());

// Pages the phone bottom bar already lists (Home, Accounts, Budget, Pay) and the page "Pay" opens.
const BAR_KEYS = new Set([...BOTTOM_BAR_TABS.map((tab) => tab.key), "takeHome"]);

/**
 * With the bottom bar on screen the drawer holds only what the bar does not (owner ruling): no
 * second list of Home, Accounts, Budget and Pay. A group keeps its pages the bar cannot reach (Self
 * Assessment under Pay).
 */
export function withoutBarPages(routes: NavRouteItem[]): NavRouteItem[] {
  return routes.flatMap((route) => {
    if (!route.children) return BAR_KEYS.has(route.key) ? [] : [route];
    const children = route.children.filter((child) => !BAR_KEYS.has(child.key));
    if (children.length === 0) return [];
    return [{ ...route, children }];
  });
}

/** App content for the shared `NavDrawer` (modal behaviour lives in `@repo/ui`). */
const MobileNavDrawer: FC<MobileNavDrawerProps> = ({ isOpen, onClose, user, sandbox }) => {
  const { t } = useTranslation();
  const { profile } = useUserProfile();

  const enabled = profile.enabledPages || [];
  const authRoutes = user
    ? filterNavRoutes(AUTH_NAV_ROUTES, enabled, isPageEnabled)
    : sandbox
      ? AUTH_NAV_ROUTES
      : [];

  return (
    <NavDrawer
      isOpen={isOpen}
      logo={<HomeLogo decorative renderLink={renderHomeLogoLink} />}
      onClose={onClose}
      footer={
        <>
          {!!user && (
            <>
              {/* Same row as the pages above: icon, then label. */}
              <Link className={footerLinkClass} to="/app/profile" onClick={onClose}>
                <Icon icon={Settings} size="sm" />
                <span>{t("settings", "Settings")}</span>
              </Link>
              <Link className={footerLinkClass} to={CONNECT_AI_ROUTE} onClick={onClose}>
                <Icon icon={Sparkles} size="sm" />
                <span>{t("connectAi", "Connect AI")}</span>
              </Link>
              <Link className={footerLinkClass} to="/tools" onClick={onClose}>
                <Icon icon={Calculator} size="sm" />
                <span>{t("freeCalculators", "Free calculators")}</span>
              </Link>
            </>
          )}
          {/* The theme switch lives in the top bar at every width, so the drawer leaves it out. */}
          <div className={footerRow()}>
            <UserLogin />
          </div>
        </>
      }
    >
      {sandbox && !user ? (
        <Link className={signUpLink()} to="/signup" onClick={onClose}>
          {t("signUp", "Sign up")}
          <span>{t("signUpToOpen", "Sign up to open")}</span>
        </Link>
      ) : null}
      <NavMenu
        isMobile
        routes={
          // The bottom bar shows signed in and in the sandbox; elsewhere the drawer is the only nav.
          user || sandbox ? withoutBarPages(authRoutes) : [HOME_NAV_ROUTE, ...authRoutes]
        }
        isRouteDisabled={
          sandbox && !user ? (item) => SANDBOX_DISABLED_KEYS.has(item.key) : undefined
        }
        variant="mobile"
        onNavigate={onClose}
      />
    </NavDrawer>
  );
};

export default MobileNavDrawer;
