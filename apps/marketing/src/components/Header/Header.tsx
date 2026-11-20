import { hasSessionPresenceCookie } from "@flump/finance-engine";
import {
  type AppNavChild,
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
  topBarOptionalAction,
  VisuallyHidden,
} from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { ExternalLink } from "lucide-react";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useThemeContext } from "../../context/ThemeContext";
import { FEATURES, FEATURES_INDEX } from "../../utils/featureAreas";
import { signupCta } from "../../utils/site";
import { getAppUrl } from "../../utils/url";
import {
  belowWide,
  drawerCta,
  drawerCtas,
  drawerGroup,
  drawerGroupHeading,
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
const FEATURES_INDEX_KEY = "features-index";

/**
 * The Features menu (E42 S4): the features page, the five areas in the app's order, the AI
 * connection, then Security and privacy, so it stays one press from every page.
 */
const FEATURE_LINKS: AppNavChild[] = [
  {
    key: FEATURES_INDEX_KEY,
    label: FEATURES_INDEX.title,
    href: FEATURES_INDEX.path,
    description: "All five areas on one page",
  },
  ...FEATURES.map((feature) => ({
    key: feature.key,
    label: feature.name,
    href: feature.path,
    description: feature.menuDescription,
  })),
  {
    key: "security",
    label: "Security and privacy",
    href: "/security",
    description: "What Flump can see",
  },
];

/** `id` of every page's `<main>`, target of the skip link. */
export const MAIN_ID = "main";

const renderHomeLogoLink = (props: HomeLogoLinkProps) => <Link to="/" {...props} />;

/** Feature paths and the menu key each one marks (the Features group then shows as current). */
const MENU_KEYS: Readonly<Record<string, string>> = {
  [FEATURES_INDEX.path]: FEATURES_INDEX_KEY,
  ...Object.fromEntries(FEATURES.map((feature) => [feature.path, feature.key])),
  "/security": "security",
  "/preview": "preview",
  "/pricing": "pricing",
  "/contact": "contact",
};

const activeKeyFor = (pathname: string): string | undefined => {
  const lower = pathname.toLowerCase();
  const path = lower.length > 1 ? lower.replace(/\/+$/, "") : lower;
  return Object.hasOwn(MENU_KEYS, path) ? MENU_KEYS[path] : undefined;
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

  // Three links (E42 S4): Features (a menu), Preview, Pricing. Calculators and the AI connection
  // no longer have top links; the AI connection is in the Features menu like every other feature.
  const items = useMemo<AppNavItem[]>(
    () => [
      {
        key: "features",
        label: FEATURES_INDEX.navLabel,
        href: FEATURES_INDEX.path,
        children: FEATURE_LINKS,
      },
      { key: "preview", label: "Preview", href: "/preview" },
      { key: "pricing", label: "Pricing", href: "/pricing" },
    ],
    [],
  );

  // The phone menu: the Features group under its heading, then the other pages with a hint each.
  // Contact is here and in the footer; the top bar has no room for it.
  const drawerItems = useMemo<MarketingNavItem[]>(
    () => [
      { key: "preview", label: "Preview", href: "/preview", hint: "Sample figures" },
      { key: "pricing", label: "Pricing", href: "/pricing", hint: "Free during the beta" },
      { key: "contact", label: "Contact", href: "/contact", hint: "Email us" },
    ],
    [],
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
            <div className={cx(headerAuth(), topBarOptionalAction())}>
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
          <p className={drawerGroupHeading()} id="drawer-features-heading">
            {FEATURES_INDEX.navLabel}
          </p>
          <ul aria-labelledby="drawer-features-heading" className={drawerGroup()}>
            {FEATURE_LINKS.map((link) => (
              <li key={link.key}>
                <Link
                  aria-current={link.key === activeKey ? "page" : undefined}
                  className={navDrawerLink()}
                  to={link.href}
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
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
