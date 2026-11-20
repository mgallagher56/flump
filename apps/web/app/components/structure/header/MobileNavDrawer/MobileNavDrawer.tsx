import { buttonVariants, HomeLogo, Icon, NavDrawer } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { Bot, Calculator, LogOut, Settings } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Form, Link, useLocation } from "react-router";
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
import { useInviteOnly } from "~/hooks/useInviteOnly";
import { useUserProfile } from "~/hooks/useUserProfile";
import { isPageEnabled } from "~/utils/pageConfig";
import { footerRow, signOutForm, signUpLink } from "./MobileNavDrawer.styles";

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

/**
 * Settings, Connect AI and Calculators use the same row as the pages above them, and the same
 * "current" fill (NavMenu draws its current page with the secondary variant).
 */
const footerLinkClass = (current: boolean) =>
  cx(buttonVariants({ variant: current ? "secondary" : "ghost" }), mobileLink());

/**
 * Which footer row is the current page. Settings and Connect AI share `/app/profile`, so the tab
 * decides between them; a plain NavLink would mark both.
 */
export function currentFooterRow(
  pathname: string,
  search: string,
): "settings" | "connectAi" | "tools" | undefined {
  if (pathname === "/tools" || pathname.startsWith("/tools/")) return "tools";
  if (pathname !== "/app/profile" && !pathname.startsWith("/app/profile/")) return undefined;
  return new URLSearchParams(search).get("tab") === "ai_connections" ? "connectAi" : "settings";
}

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
  const inviteOnly = useInviteOnly();
  const { profile } = useUserProfile();
  const { pathname, search } = useLocation();
  const currentRow = currentFooterRow(pathname, search);
  const rowProps = (row: NonNullable<typeof currentRow>) => ({
    "aria-current": currentRow === row ? ("page" as const) : undefined,
    className: footerLinkClass(currentRow === row),
  });

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
              <Link {...rowProps("settings")} to="/app/profile" onClick={onClose}>
                <Icon icon={Settings} size="sm" />
                <span>{t("settings", "Settings")}</span>
              </Link>
              <Link {...rowProps("connectAi")} to={CONNECT_AI_ROUTE} onClick={onClose}>
                {/* The same icon as the account menu's "Connect AI" (P68). */}
                <Icon icon={Bot} size="sm" />
                <span>{t("connectAi", "Connect AI")}</span>
              </Link>
              <Link {...rowProps("tools")} to="/tools" onClick={onClose}>
                <Icon icon={Calculator} size="sm" />
                <span>{t("freeCalculators", "Free calculators")}</span>
              </Link>
            </>
          )}
          {/* The theme switch lives in the top bar at every width, so the drawer leaves it out. */}
          {user ? (
            // Signed in, "Sign out" is one more row like those above it, with its own icon (P14).
            <Form action="/logout" className={signOutForm()} method="post">
              <button className={footerLinkClass(false)} type="submit">
                <Icon icon={LogOut} size="sm" />
                <span>{t("logOut", "Sign out")}</span>
              </button>
            </Form>
          ) : (
            <div className={footerRow()}>
              <UserLogin />
            </div>
          )}
        </>
      }
    >
      {sandbox && !user && !inviteOnly ? (
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
        // Signed in, "Pay" with its pages is inline in the tablet top bar, so the drawer drops it
        // there. The signed-out bar shows only Home, so the sandbox drawer keeps every group.
        isGroupInlineFromNavInline={user ? (item) => BAR_KEYS.has(item.key) : undefined}
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
