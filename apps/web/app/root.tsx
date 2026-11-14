import { THEME_INIT_SCRIPT, ToastProvider, useThemePreference, VisuallyHidden } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { useEffect } from "react";
import type { LoaderFunctionArgs } from "react-router";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
} from "react-router";
import { AppBottomBar } from "./components/navigation/AppBottomBar";
import { NavigationProgress } from "./components/navigation/NavigationProgress";
import Header from "./components/structure/header/Header";
import { ResponsiveProvider } from "./context/ResponsiveContext";
import { ErrorShell } from "./features/feedback/components/ErrorShell";
import { RouteErrorBoundary } from "./features/feedback/components/RouteErrorBoundary";
import type { UserProfile } from "./hooks/useUserProfile";
import { useUserProfile } from "./hooks/useUserProfile";
import i18n from "./i18n";
import "@repo/ui/fonts.css";
import styles from "./index.css?url";
import { sentryPublicEnv } from "./observability/env";
import { securityMiddleware } from "./security/middleware.server";
import { useNonce } from "./security/nonce";
import { backendFetch } from "./services/backend-client.server";
import { BackendError } from "./services/backend-error";
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
      userProfile = await backendFetch<UserProfile>("/user-profile", {
        accessToken,
        signal: args.request.signal,
      });
    } catch (error) {
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

export default function App() {
  const { locale, user, userProfile, ENV, isMobileClient } = useLoaderData<typeof loader>();
  const nonce = useNonce();
  const { theme, preference, setPreference, toggleTheme } = useThemePreference();
  const { setProfile } = useUserProfile();

  // Sign-out wipes this browser's per-user storage (E19 A6); covers every form posting to /logout.
  useEffect(() => watchLogoutForms(), []);

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile, setProfile]);

  return (
    <html className={theme === "dark" ? "dark" : ""} data-theme={theme} lang={locale}>
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
                  base: user ? "72px" : "0px",
                  lg: "0px",
                },
              })}
            >
              <ToastProvider>
                <Header />
                <div
                  className={css({
                    maxWidth: "1536px",
                    margin: "0 auto",
                    paddingX: { base: "12px", md: "24px" },
                  })}
                >
                  <main
                    id="main-content"
                    tabIndex={-1}
                    className={css({
                      paddingBottom: {
                        // Reads the wrapper's bottom-bar offset so the two never drift apart.
                        base: user
                          ? "calc(var(--app-bottom-bar-offset) + env(safe-area-inset-bottom, 0px))"
                          : "0",
                        lg: "0",
                      },
                    })}
                  >
                    <Outlet />
                  </main>
                  <AppBottomBar user={user} />
                </div>
              </ToastProvider>
            </div>
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
  const { theme } = useThemePreference();
  const error = useRouteError();
  const title =
    isRouteErrorResponse(error) && error.status === 404 ? "Page not found" : "Something went wrong";
  // The root boundary replaces the whole document, so it must render html and body itself.
  return (
    <html className={theme === "dark" ? "dark" : ""} data-theme={theme} lang="en">
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
        })}
      >
        <ErrorShell>
          <RouteErrorBoundary headingLevel="h1" />
        </ErrorShell>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}
