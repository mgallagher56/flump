import { THEME_INIT_SCRIPT, ToastProvider, useThemePreference, VisuallyHidden } from "@repo/ui";
import { css, cx } from "@repo/ui/styled-system/css";
import { type ReactNode, useEffect } from "react";
import type { LoaderFunctionArgs } from "react-router";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
  useRevalidator,
  useRouteError,
  useRouteLoaderData,
} from "react-router";
import { AppBottomBar } from "./components/navigation/AppBottomBar";
import { NavigationProgress } from "./components/navigation/NavigationProgress";
import { AppFooter } from "./components/structure/footer/AppFooter";
import Header from "./components/structure/header/Header";
import { ResponsiveProvider } from "./context/ResponsiveContext";
import { RouteErrorBoundary } from "./features/feedback/components/RouteErrorBoundary";
import { useIsFocusedShell } from "./features/onboarding/focusedShell";
import { forgetRootUserOnAuthError, useRootUser } from "./hooks/useRootUser";
import { useRouteFocus } from "./hooks/useRouteFocus";
import { useScrollRestoreAfterGrowth } from "./hooks/useScrollRestoreAfterGrowth";
import type { UserProfile } from "./hooks/useUserProfile";
import i18n from "./i18n";
import { registerSavedDataReload, revalidateRootData } from "./services/conflict";
import { scrollRestorationKey } from "./utils/scrollRestorationKey";
import "@repo/ui/fonts.css";
// PROTOTYPE ONLY (app design prototypes branch, never merged).
import "./prototype/prototype.css";
import "./prototype/prototype-r2.css";
import "./prototype/prototype-r4.css";
import { TermsStatusResponse } from "@flump/api-contract";
import { hasUpcomingAcceptanceChange } from "@flump/business-details";
import { TermsChangeNotice } from "~/features/legal/components/TermsChangeNotice";
import { isUpcoming } from "~/features/legal/terms";
import { backendFetch } from "~/services/backend-client.server";
import { getMarketingUrl } from "~/utils/marketingUrl";
import styles from "./index.css?url";
import { sentryPublicEnv } from "./observability/env";
import { PrototypeLayer } from "./prototype/PrototypeLayer";
import { securityMiddleware } from "./security/middleware.server";
import { useNonce } from "./security/nonce";
import { ACCOUNT_ERASED_PATH, BackendError, isAccountErased } from "./services/backend-error";
import { isInviteOnly } from "./services/beta-mode.server";
import { inviteGateMiddleware } from "./services/invite-gate.server";
import { loadRootProfile } from "./services/root-profile.server";
import { throwRouteError } from "./services/route-error.server";
import {
  isTermsExemptPath,
  isTermsNotAccepted,
  termsAcceptanceRedirect,
  termsGateMiddleware,
} from "./services/terms-gate.server";
import { ThemeContext } from "./ThemeContext";
import { getAuthSession } from "./utils/auth.server";
import { watchLogoutForms } from "./utils/userStorage";

// Same favicon file as the marketing site (guarded by chrome-parity.laws.test.ts).
export const links = () => [
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "stylesheet", href: styles },
];

// The invite and terms gates run inside the security middleware, so their answers get the same
// headers. The terms gate runs after the invite gate: "not invited" comes before the terms.
export const middleware = [securityMiddleware, inviteGateMiddleware, termsGateMiddleware];

// A save refused with 412 reloads the profile too, so the next save sends its latest version.
export const shouldRevalidate = revalidateRootData;

export const loader = async (args: LoaderFunctionArgs) => {
  const locale = i18n.lng;
  // Started first so it overlaps the session and profile reads (usually answered from memory).
  const inviteOnlyRead = isInviteOnly();
  const session = await getAuthSession(args, { ensureSignedIn: false });
  // A user without an access token is treated as signed out; never invent a token.
  const user = session.accessToken ? session.user : null;
  // Server-only: used below to fetch the profile and never returned from this loader (E20-N8).
  const { accessToken } = session;
  let userProfile: UserProfile | null = null;
  let notInvited = false;

  if (user && accessToken) {
    try {
      // Shared with the invite gate, which may already have read it for this request.
      userProfile = await loadRootProfile(args.context, accessToken, args.request.signal);
    } catch (error) {
      // An erased account (410) goes to the page that finishes the deletion, unless already there.
      if (
        isAccountErased(error) &&
        !new URL(args.request.url).pathname.startsWith("/account-deleted")
      ) {
        throw redirect(ACCOUNT_ERASED_PATH);
      }
      // An uninvited account gets the root "not invited" page, never the app shell. An invite link
      // is the exception: it is how an uninvited person joins, so it renders its own outcome in a
      // shell with no header or nav.
      if (error instanceof BackendError && error.kind === "not-invited") {
        if (!isInvitePath(new URL(args.request.url).pathname)) throwRouteError(error);
        notInvited = true;
      }
      // Not yet agreed to the terms in force: the acceptance page, unless already on a page that
      // works without agreeing (the acceptance page itself, sign-out, the export download). The
      // terms gate catches full page loads first; this catches client navigations.
      if (isTermsNotAccepted(error)) {
        if (!isTermsExemptPath(new URL(args.request.url).pathname)) {
          throw termsAcceptanceRedirect(args.request);
        }
      }
      // Keep the shell up without a profile; log only the kind and endpoint, never the token.
      if (error instanceof BackendError) {
        console.error("Root loader profile failed", { kind: error.kind, endpoint: error.endpoint });
      } else {
        throw error;
      }
    }
  }

  // A coming change to the terms or privacy notice (published, not yet in force), shown on the
  // home page only. Asked of the backend only there and only while LEGAL_PAGES holds a version
  // dated in the future, so no other page load spends a read on it (every read counts against the
  // person's rate limit). Best effort: a failed read shows no notice.
  let termsUpcoming: { terms: boolean; privacyNotice: boolean; effectiveFrom: string } | null =
    null;
  const onHome = new URL(args.request.url).pathname === "/";
  if (onHome && userProfile && accessToken && hasUpcomingAcceptanceChange(new Date())) {
    const status = await backendFetch("/user-profile/terms-acceptance", {
      accessToken,
      schema: TermsStatusResponse,
      signal: args.request.signal,
    }).catch(() => null);
    if (status && isUpcoming(status)) {
      const [effectiveFrom] = [status.terms.effectiveFrom, status.privacyNotice.effectiveFrom]
        .sort()
        .reverse();
      termsUpcoming = {
        terms: status.terms.changed,
        privacyNotice: status.privacyNotice.changed,
        effectiveFrom: effectiveFrom ?? status.terms.effectiveFrom,
      };
    }
  }

  // Best-effort server guess so SSR output matches a phone's first client render.
  const clientHint = args.request.headers.get("sec-ch-ua-mobile");
  const isMobileClient =
    clientHint !== null
      ? clientHint === "?1"
      : /Mobi|Android|iPhone|iPod/i.test(args.request.headers.get("user-agent") ?? "");

  return {
    // Whether the beta is invite-only: the chrome then offers "Sign in" and no "Sign up".
    inviteOnly: await inviteOnlyRead,
    isMobileClient,
    locale,
    // Origin of the marketing site, the home of the legal pages the footers link to. Public.
    marketingUrl: getMarketingUrl(args.request.url),
    // Uninvited (only ever on an invite link): no user, so the chrome offers nothing of the app.
    user: notInvited ? null : user,
    notInvited,
    userProfile,
    termsUpcoming,
    // The browser's only public config channel (E20-N8): the three non-secret Sentry keys that
    // entry.client.tsx reads from `window.ENV`. Never add a token, API URL or other secret here.
    ENV: sentryPublicEnv(process.env),
  };
};

/** Until hydration, header and nav buttons show a progress cursor: a click there cannot act yet. */
const preHydrationChrome = css({
  "&:not([data-hydrated]) :is(header, nav) button": { cursor: "progress" },
});

/** Every page is British English, whatever the i18next language code says. */
const DOCUMENT_LANG = "en-GB";

/**
 * The route outlet. While a navigation loads, the current page stays on screen untouched and the
 * only loading signal is the thin `NavigationProgress` bar (after the shared delay); the new page
 * replaces it in one step when its data is ready. No generic page skeleton: one that does not match
 * the destination moves the layout twice (UX-GUIDELINES "Loading").
 */
function RouteOutlet() {
  return <Outlet />;
}

interface AppShellProps {
  user: unknown;
  /** A focused flow (onboarding) draws its own header, so the shell leaves out the app nav. */
  focused?: boolean;
  children: ReactNode;
}

/**
 * The app chrome shared by every page and by the root error boundary, so error and 404 pages keep
 * the normal header (signed in or out) and, on a phone, the bottom bar.
 */
function AppShell({ user, focused = false, children }: AppShellProps) {
  const hasBottomBarOffset = Boolean(user) && !focused;
  // The hydration signal, set here so pages and the error boundary both raise it: chrome controls
  // read it to stop looking pressable before script runs, and end-to-end tests wait on
  // `html[data-hydrated]` instead of a timeout.
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);
  // A new page starts with focus on <main>; <ScrollRestoration> below puts it at the top.
  useRouteFocus();
  // Back and Forward keep the saved place while a page that sizes itself late (charts) grows.
  useScrollRestoreAfterGrowth();
  return (
    <>
      <VisuallyHidden as="a" focusable href="#main-content">
        Skip to content
      </VisuallyHidden>
      <NavigationProgress />
      <PrototypeLayer />
      {/* Layout offsets other components read: the mobile bottom bar height (the toast viewport
          adds the safe-area inset itself) and the sticky header height (SimulatorSplitLayout's
          sticky parts sit below it). */}
      <div
        className={css({
          // Mirrors the TopBar min-height (spacing tokens 14 and 18); keep the two in step. Both
          // switch at the shared nav breakpoint, where the bottom bar gives way to the top nav.
          "--app-header-offset": { base: "3.5rem", _navInline: "4.5rem" },
          "--app-bottom-bar-offset": {
            base: hasBottomBarOffset ? "72px" : "0px",
            _navInline: "0px",
          },
        })}
      >
        <ToastProvider>
          {!focused && <Header />}
          <div
            className={css({
              maxWidth: "1536px",
              margin: "0 auto",
              paddingX: { base: "12px", md: "24px" },
            })}
          >
            <main
              data-page-shell="web"
              id="main-content"
              tabIndex={-1}
              className={css({
                // One gap between the sticky header and every page's first block, so no
                // page title or banner sits flush against the header.
                paddingTop: { base: "4", md: "6" },
                paddingBottom: "0",
              })}
            >
              {children}
            </main>
            {!focused && <AppBottomBar user={user} />}
          </div>
          {hasBottomBarOffset && <AppFooter />}
        </ToastProvider>
      </div>
    </>
  );
}

export default function App() {
  const { user, ENV, isMobileClient, notInvited, termsUpcoming } = useLoaderData<typeof loader>();
  const location = useLocation();
  const nonce = useNonce();
  const { theme, preference, setPreference, toggleTheme } = useThemePreference();
  const focused = useIsFocusedShell() || notInvited;

  // Sign-out wipes this browser's per-user storage (E19 A6); covers every form posting to /logout.
  useEffect(() => watchLogoutForms(), []);

  // A browser-side save refused with 412 reloads every loader's saved data (BE-16).
  const revalidator = useRevalidator();
  useEffect(() => {
    registerSavedDataReload(() => revalidator.revalidate());
    return () => registerSavedDataReload(null);
  }, [revalidator]);

  return (
    <html
      className={cx(theme === "dark" ? "dark" : undefined, preHydrationChrome)}
      data-theme={theme}
      lang={DOCUMENT_LANG}
    >
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width,initial-scale=1,viewport-fit=cover" name="viewport" />
        <meta name="color-scheme" content="light dark" />
        <Meta />
        <Links />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(ENV).replace(/</g, "\\u003c")};`,
          }}
        />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={css({
          backgroundColor: "surface.canvas",
          color: "text.primary",
          fontFamily: "body",
          margin: "0",
          minHeight: "100vh",
          _motionSafe: {
            transition:
              "background-color token(durations.base) token(easings.standard), color token(durations.base) token(easings.standard)",
          },
        })}
      >
        <ThemeContext.Provider value={{ theme, preference, setPreference, toggleTheme }}>
          <ResponsiveProvider serverIsMobile={isMobileClient}>
            <AppShell focused={focused} user={user}>
              <RouteOutlet />
              {/* Below the page, never above its h1 (UX-GUIDELINES E8). */}
              {termsUpcoming && !focused ? (
                <TermsChangeNotice
                  {...termsUpcoming}
                  next={`${location.pathname}${location.search}`}
                />
              ) : null}
            </AppShell>
          </ResponsiveProvider>
        </ThemeContext.Provider>
        <ScrollRestoration getKey={scrollRestorationKey} nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

/** Invite links: `/invite/<token>` and `/invite`. */
function isInvitePath(pathname: string): boolean {
  return /^\/invite(\/|$)/.test(pathname);
}

/** The invite gate's refusal (or the root loader's): a 403 whose payload kind is "not-invited". */
function isNotInvitedError(error: unknown): boolean {
  return (
    isRouteErrorResponse(error) &&
    error.status === 403 &&
    (error.data as { kind?: unknown } | null)?.kind === "not-invited"
  );
}

export function ErrorBoundary() {
  const nonce = useNonce();
  const { theme, preference, setPreference, toggleTheme } = useThemePreference();
  const error = useRouteError();
  // Present when the root loader ran and a page below it failed; undefined when the root loader
  // itself failed, and then the header renders signed out.
  const rootData = useRouteLoaderData<typeof loader>("root");
  forgetRootUserOnAuthError(error);
  const rootUser = useRootUser();
  const notInvited = isNotInvitedError(error);
  const title = notInvited
    ? "This account has not been invited yet"
    : isRouteErrorResponse(error) && error.status === 404
      ? "We cannot find that page"
      : "This page did not load";
  // The root boundary replaces the whole document, so it must render html and body itself. It
  // keeps the normal chrome (header for the user's state, bottom bar on a phone) and the error
  // state gives one way back.
  return (
    <html
      className={cx(theme === "dark" ? "dark" : undefined, preHydrationChrome)}
      data-theme={theme}
      lang={DOCUMENT_LANG}
    >
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width,initial-scale=1,viewport-fit=cover" name="viewport" />
        <meta name="color-scheme" content="light dark" />
        <title>{title}</title>
        <Meta />
        <Links />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={css({
          backgroundColor: "surface.canvas",
          color: "text.primary",
          minHeight: "100vh",
          margin: "0",
        })}
      >
        <ThemeContext.Provider value={{ theme, preference, setPreference, toggleTheme }}>
          <ResponsiveProvider serverIsMobile={rootData?.isMobileClient}>
            {/* useRootUser keeps a signed-in reader's shell when the root data was lost (P17). */}
            {/* Not invited: no header, nav or bottom bar, just the page and its "Sign out". */}
            <AppShell focused={notInvited} user={notInvited ? null : rootUser}>
              <RouteErrorBoundary headingLevel="h1" isRoot />
            </AppShell>
          </ResponsiveProvider>
        </ThemeContext.Provider>
        <ScrollRestoration getKey={scrollRestorationKey} nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}
