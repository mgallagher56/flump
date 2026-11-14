import { UserProfileResponse } from "@flump/api-contract";
import {
  PageSkeleton,
  THEME_INIT_SCRIPT,
  ToastProvider,
  useThemePreference,
  VisuallyHidden,
} from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type ReactNode, useEffect, useState } from "react";
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
  useNavigation,
  useRouteError,
  useRouteLoaderData,
} from "react-router";
import { AppBottomBar } from "./components/navigation/AppBottomBar";
import { NavigationProgress } from "./components/navigation/NavigationProgress";
import Header from "./components/structure/header/Header";
import { ResponsiveProvider } from "./context/ResponsiveContext";
import { RouteErrorBoundary } from "./features/feedback/components/RouteErrorBoundary";
import { useIsFocusedShell } from "./features/onboarding/focusedShell";
import type { UserProfile } from "./hooks/useUserProfile";
import { useUserProfile } from "./hooks/useUserProfile";
import i18n from "./i18n";
import "@repo/ui/fonts.css";
import styles from "./index.css?url";
import { sentryPublicEnv } from "./observability/env";
import { securityMiddleware } from "./security/middleware.server";
import { useNonce } from "./security/nonce";
import { backendFetch } from "./services/backend-client.server";
import { ACCOUNT_ERASED_PATH, BackendError, isAccountErased } from "./services/backend-error";
import { ThemeContext } from "./ThemeContext";
import { getAuthSession } from "./utils/auth.server";
import { watchLogoutForms } from "./utils/userStorage";

// Same favicon file as the marketing site (guarded by chrome-parity.laws.test.ts).
export const links = () => [
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "stylesheet", href: styles },
];

export const middleware = [securityMiddleware];

export const loader = async (args: LoaderFunctionArgs) => {
  const locale = i18n.lng;
  const session = await getAuthSession(args, { ensureSignedIn: false });
  // A user without an access token is treated as signed out; never invent a token.
  const user = session.accessToken ? session.user : null;
  // Server-only: used below to fetch the profile and never returned from this loader (E20-N8).
  const { accessToken } = session;
  let userProfile: UserProfile | null = null;

  if (user && accessToken) {
    try {
      userProfile = await backendFetch("/user-profile", {
        accessToken,
        signal: args.request.signal,
        schema: UserProfileResponse,
      });
    } catch (error) {
      // An erased account (410) goes to the page that finishes the deletion, unless already there.
      if (
        isAccountErased(error) &&
        !new URL(args.request.url).pathname.startsWith("/account-deleted")
      ) {
        throw redirect(ACCOUNT_ERASED_PATH);
      }
      // Keep the shell up without a profile; log only the kind and endpoint, never the token.
      if (error instanceof BackendError) {
        console.error("Root loader profile failed", { kind: error.kind, endpoint: error.endpoint });
      } else {
        throw error;
      }
    }
  }

  // Best-effort server guess so SSR output matches a phone's first client render.
  const clientHint = args.request.headers.get("sec-ch-ua-mobile");
  const isMobileClient =
    clientHint !== null
      ? clientHint === "?1"
      : /Mobi|Android|iPhone|iPod/i.test(args.request.headers.get("user-agent") ?? "");

  return {
    isMobileClient,
    locale,
    user,
    userProfile,
    // The browser's only public config channel (E20-N8): the three non-secret Sentry keys that
    // entry.client.tsx reads from `window.ENV`. Never add a token, API URL or other secret here.
    ENV: sentryPublicEnv(process.env),
  };
};

/** Every page is British English, whatever the i18next language code says. */
const DOCUMENT_LANG = "en-GB";

/** How long a navigation may run before its page is swapped for the skeleton (plan P12.1). */
const SKELETON_DELAY_MS = 200;

/**
 * The route outlet, swapped for `PageSkeleton` while a navigation to another page is loading and
 * has run longer than `SKELETON_DELAY_MS` (a fast loader never flashes it). The old page stays
 * mounted but hidden, so nothing is lost if the navigation is cancelled. Same-page revalidations
 * (a form save, a tab in the query string) keep the page in view.
 */
function RouteOutlet() {
  const navigation = useNavigation();
  const { pathname } = useLocation();
  const loadingOtherPage =
    navigation.state === "loading" &&
    navigation.location !== undefined &&
    navigation.location.pathname !== pathname;
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!loadingOtherPage) {
      setShowSkeleton(false);
      return;
    }
    const timer = setTimeout(() => setShowSkeleton(true), SKELETON_DELAY_MS);
    return () => clearTimeout(timer);
  }, [loadingOtherPage]);

  const pending = loadingOtherPage && showSkeleton;
  return (
    <>
      {pending && <PageSkeleton delayMs={0} />}
      <div
        className={css({ display: pending ? "none" : "contents" })}
        data-route-outlet={pending ? "pending" : "ready"}
      >
        <Outlet />
      </div>
    </>
  );
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
  return (
    <>
      <VisuallyHidden as="a" focusable href="#main-content">
        Skip to content
      </VisuallyHidden>
      <NavigationProgress />
      {/* Layout offsets other components read: the mobile bottom bar height (the toast viewport
          adds the safe-area inset itself) and the sticky header height (SimulatorSplitLayout's
          sticky parts sit below it). */}
      <div
        className={css({
          // Mirrors the TopBar min-height (spacing tokens 14 and 18); keep the two in step.
          "--app-header-offset": { base: "3.5rem", lg: "4.5rem" },
          "--app-bottom-bar-offset": {
            base: hasBottomBarOffset ? "72px" : "0px",
            lg: "0px",
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
                paddingBottom: {
                  // Reads the wrapper's bottom-bar offset so the two never drift apart.
                  base: hasBottomBarOffset
                    ? "calc(var(--app-bottom-bar-offset) + env(safe-area-inset-bottom, 0px))"
                    : "0",
                  lg: "0",
                },
              })}
            >
              {children}
            </main>
            {!focused && <AppBottomBar user={user} />}
          </div>
        </ToastProvider>
      </div>
    </>
  );
}

export default function App() {
  const { user, userProfile, ENV, isMobileClient } = useLoaderData<typeof loader>();
  const nonce = useNonce();
  const { theme, preference, setPreference, toggleTheme } = useThemePreference();
  const { setProfile } = useUserProfile();
  const focused = useIsFocusedShell();

  // Sign-out wipes this browser's per-user storage (E19 A6); covers every form posting to /logout.
  useEffect(() => watchLogoutForms(), []);

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile, setProfile]);

  return (
    <html className={theme === "dark" ? "dark" : ""} data-theme={theme} lang={DOCUMENT_LANG}>
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
        style={{
          backgroundColor: "var(--colors-surface-canvas)",
          color: "var(--colors-text-primary)",
          fontFamily:
            "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          minHeight: "100vh",
          transition: "background-color 0.2s ease, color 0.2s ease",
        }}
      >
        <ThemeContext.Provider value={{ theme, preference, setPreference, toggleTheme }}>
          <ResponsiveProvider serverIsMobile={isMobileClient}>
            <AppShell focused={focused} user={user}>
              <RouteOutlet />
            </AppShell>
          </ResponsiveProvider>
        </ThemeContext.Provider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const nonce = useNonce();
  const { theme, preference, setPreference, toggleTheme } = useThemePreference();
  const error = useRouteError();
  // Present when the root loader ran and a page below it failed; undefined when the root loader
  // itself failed, and then the header renders signed out.
  const rootData = useRouteLoaderData<typeof loader>("root");
  const title =
    isRouteErrorResponse(error) && error.status === 404
      ? "We cannot find that page"
      : "This page did not load";
  // The root boundary replaces the whole document, so it must render html and body itself. It
  // keeps the normal chrome (header for the user's state, bottom bar on a phone) and the error
  // state gives one way back.
  return (
    <html className={theme === "dark" ? "dark" : ""} data-theme={theme} lang={DOCUMENT_LANG}>
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
            <AppShell user={rootData?.user ?? null}>
              <RouteErrorBoundary headingLevel="h1" />
            </AppShell>
          </ResponsiveProvider>
        </ThemeContext.Provider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}
