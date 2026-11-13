import { VisuallyHidden } from "@repo/ui";
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
import Header from "./components/structure/header/Header";
import { ResponsiveProvider } from "./context/ResponsiveContext";
import { RouteErrorBoundary } from "./features/feedback/components/RouteErrorBoundary";
import { useTheme } from "./hooks/useTheme";
import type { UserProfile } from "./hooks/useUserProfile";
import { useUserProfile } from "./hooks/useUserProfile";
import i18next from "./i18n.server";
import "@repo/ui/fonts.css";
import styles from "./index.css?url";
import { sentryPublicEnv } from "./observability/env";
import { securityMiddleware } from "./security/middleware.server";
import { backendFetch } from "./services/backend-client.server";
import { BackendError } from "./services/backend-error";
import { ThemeContext } from "./ThemeContext";
import { THEME_INIT_SCRIPT } from "./theme-init-script";
import { getAuthSession } from "./utils/auth.server";
import { watchLogoutForms } from "./utils/userStorage";

export const links = () => [{ rel: "stylesheet", href: styles }];

export const middleware = [securityMiddleware];

export const loader = async (args: LoaderFunctionArgs) => {
  const locale = await i18next.getLocale(args.request);
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
  const { theme, preference, setPreference, toggleTheme } = useTheme();
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
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(ENV).replace(/</g, "\\u003c")};`,
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        style={{
          backgroundColor: "var(--colors-surface-canvas)",
          color: "var(--colors-text-primary)",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
                    base: user ? "calc(72px + env(safe-area-inset-bottom, 0px))" : "0",
                    md: "0",
                  },
                })}
              >
                <Outlet />
              </main>
              <AppBottomBar user={user} />
            </div>
          </ResponsiveProvider>
        </ThemeContext.Provider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const { theme } = useTheme();
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
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={css({
          backgroundColor: "surface.canvas",
          color: "text.primary",
          minHeight: "100vh",
          padding: { base: "24px", md: "48px" },
        })}
      >
        <RouteErrorBoundary />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
