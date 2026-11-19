import { hasSessionPresenceCookie } from "@flump/finance-engine";
import {
  type AppNavItem,
  type AppNavRenderLink,
  Button,
  HomeLogo,
  type HomeLogoLinkProps,
  NavDrawer,
  navDrawerBody,
  navDrawerLink,
  ThemeToggle,
  TopBar,
  VisuallyHidden,
} from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { ExternalLink } from "lucide-react";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useThemeContext } from "../../context/ThemeContext";
import { signupCta } from "../../utils/site";
import { getAppUrl } from "../../utils/url";
import {
  belowWide,
  drawerCta,
  drawerCtas,
  drawerLinkHint,
  drawerLinkLabel,
  drawerLinkRow,
  fullLabel,
  headerAuth,
  headerButton,
  shortLabel,
  wideOnly,
} from "./Header.styles";

interface MarketingNavItem extends AppNavItem {
  /** Helper text shown beside the label in the mobile drawer. */
  hint: string;
  /** Opens the web app in a new tab rather than a marketing route. */
  external?: boolean;
}

const DRAWER_ID = "mobile-nav-drawer";

/** `id` of every page's `<main>`, target of the skip link. */
export const MAIN_ID = "main";

const renderHomeLogoLink = (props: HomeLogoLinkProps) => <Link to="/" {...props} />;

const activeKeyFor = (pathname: string): string | undefined => {
  if (pathname.startsWith("/tools")) return "tools";
  if (pathname === "/pricing") return "pricing";
  if (pathname === "/security") return "security";
  if (pathname === "/mcp") return "mcp";
  if (pathname === "/contact") return "contact";
  return undefined;
};

/**
 * Marketing site header. Same chrome as the web app (`TopBar`, `HomeLogo`, `ThemeToggle` and
 * `NavDrawer` from `@repo/ui`, switching at the shared nav breakpoint); only the links and calls
 * to action are the site's own.
 */
export const Header: FC = () => {
  const [hasSession, setHasSession] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { preference, setPreference } = useThemeContext();
  const appUrl = getAppUrl();
  const cta = signupCta();

  const items = useMemo<MarketingNavItem[]>(
    () => [
      {
        key: "tools",
        label: "Calculators",
        href: "/tools",
        hint: "No sign-in needed",
      },
      { key: "pricing", label: "Pricing", href: "/pricing", hint: "Free during the beta" },
      { key: "security", label: "Security", href: "/security", hint: "What Flump can see" },
      // Inline from 1024px (navWide) with every other link; below that all links are in the menu.
      {
        key: "mcp",
        label: "AI connection",
        href: "/mcp",
        hint: "Use with Claude",
        wideOnly: true,
      },
      {
        key: "preview",
        wideOnly: true,
        label: "Preview",
        href: "/preview",
        hint: "Sample figures",
      },
    ],
    [],
  );

  // The phone menu also offers Contact; the top bar has no room for it, and the footer links it.
  const drawerItems = useMemo<MarketingNavItem[]>(
    () => [...items, { key: "contact", label: "Contact", href: "/contact", hint: "Email us" }],
    [items],
  );

  useEffect(() => {
    setHasSession(hasSessionPresenceCookie());
  }, []);

  // Close the drawer on every route change.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const closeMenu = useCallback(() => setMobileMenuOpen(false), []);

  const renderLink: AppNavRenderLink = (item, className, children, ariaCurrent) =>
    (item as MarketingNavItem).external ? (
      <a className={className} href={item.href} rel="noreferrer" target="_blank">
        {children}
        <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
      </a>
    ) : (
      <Link aria-current={ariaCurrent} className={className} to={item.href}>
        {children}
      </Link>
    );

  const activeKey = activeKeyFor(location.pathname);

  return (
    <>
      <VisuallyHidden as="a" focusable href={`#${MAIN_ID}`}>
        Skip to main content
      </VisuallyHidden>
      <TopBar
        actions={
          <>
            {/* One 44px button below 1024px (as in the web app); the three-way switch from there. */}
            <ThemeToggle
              className={belowWide()}
              id="theme-toggle-compact"
              onChange={setPreference}
              preference={preference}
              variant="cycle"
            />
            <div className={wideOnly()}>
              <ThemeToggle onChange={setPreference} preference={preference} />
            </div>
            <div className={headerAuth()}>
              {hasSession ? (
                <Button asChild className={headerButton()} size="sm" variant="primary">
                  <a href={`${appUrl}/`}>
                    <span className={fullLabel()}>Go to dashboard</span>
                    <span className={shortLabel()}>Dashboard</span>
                  </a>
                </Button>
              ) : (
                <>
                  {/* From 1024px only: at 768px the bar has no room for it. On tablets "Sign in"
                      is in the footer, on phones in the menu. The wrapper owns the display swap, so
                      it never competes with the button's own display. */}
                  <span className={wideOnly()}>
                    <Button asChild className={headerButton()} size="sm" variant="ghost">
                      <a href={`${appUrl}/login`}>
                        <span className={fullLabel()}>Sign in</span>
                        <span className={shortLabel()}>Sign in</span>
                      </a>
                    </Button>
                  </span>
                  <Button asChild className={headerButton()} size="sm" variant="primary">
                    <a href={cta.href}>
                      <span className={fullLabel()}>{cta.label}</span>
                      <span className={shortLabel()}>{cta.shortLabel}</span>
                    </a>
                  </Button>
                </>
              )}
            </div>
          </>
        }
        activeKey={activeKey}
        items={items}
        logo={<HomeLogo current={location.pathname === "/"} renderLink={renderHomeLogoLink} />}
        menuControls={DRAWER_ID}
        menuExpanded={mobileMenuOpen}
        linksFrom="wide"
        menuBelow="wide"
        menuLabel="Open navigation menu"
        navLabel="Primary"
        renderLink={renderLink}
        onMenuClick={() => setMobileMenuOpen((open) => !open)}
      />
      <NavDrawer
        footer={
          <div className={drawerCtas()}>
            {hasSession ? (
              <Button asChild className={drawerCta()} size="md" variant="primary">
                <a href={`${appUrl}/`} onClick={closeMenu}>
                  Go to dashboard
                </a>
              </Button>
            ) : (
              <>
                <Button asChild className={drawerCta()} size="md" variant="primary">
                  <a href={cta.href} onClick={closeMenu}>
                    {cta.label}
                  </a>
                </Button>
                <Button asChild className={drawerCta()} size="md" variant="outline">
                  <a href={`${appUrl}/login`} onClick={closeMenu}>
                    Sign in
                  </a>
                </Button>
              </>
            )}
          </div>
        }
        id={DRAWER_ID}
        isOpen={mobileMenuOpen}
        logo={<HomeLogo renderLink={renderHomeLogoLink} />}
        onClose={closeMenu}
      >
        <nav aria-label="Mobile navigation" className={navDrawerBody()}>
          {drawerItems.map((item) => {
            const className = cx(navDrawerLink(), drawerLinkRow());
            const content = (
              <>
                <span className={drawerLinkLabel()}>
                  {item.label}
                  {item.external && (
                    <>
                      <ExternalLink aria-hidden="true" size={14} />
                      <VisuallyHidden>(opens in a new tab)</VisuallyHidden>
                    </>
                  )}
                </span>
                <span className={drawerLinkHint()}>{item.hint}</span>
              </>
            );
            return item.external ? (
              <a
                className={className}
                href={item.href}
                key={item.key}
                rel="noreferrer"
                target="_blank"
                onClick={closeMenu}
              >
                {content}
              </a>
            ) : (
              <Link
                aria-current={item.key === activeKey ? "page" : undefined}
                className={className}
                key={item.key}
                to={item.href}
                onClick={closeMenu}
              >
                {content}
              </Link>
            );
          })}
        </nav>
      </NavDrawer>
    </>
  );
};
