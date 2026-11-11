import { css } from "@repo/ui/styled-system/css";
import { useEffect } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "react-router";
import MobileBottomBar from "./components/navigation/MobileBottomBar";
import Header from "./components/structure/header/Header";
import { ResponsiveProvider } from "./context/ResponsiveContext";
import { RouteErrorBoundary } from "./features/feedback/components/RouteErrorBoundary";
import { useTheme } from "./hooks/useTheme";
import type { UserProfile } from "./hooks/useUserProfile";
import { useUserProfile } from "./hooks/useUserProfile";
import i18next from "./i18n.server";
import styles from "./index.css?url";
import { ThemeContext } from "./ThemeContext";
import { getAuthSession } from "./utils/auth.server";

export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800;900&display=swap",
  },
  { rel: "stylesheet", href: styles },
];

export const loader = async (args: LoaderFunctionArgs) => {
  const locale = await i18next.getLocale(args.request);
  const session = await getAuthSession(args, { ensureSignedIn: false });
  // A user without an access token is treated as signed out; never invent a token.
  const user = session.accessToken ? session.user : null;
  const { accessToken } = session;
  let userProfile: UserProfile | null = null;

  if (user && accessToken) {
    try {
      const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
      const res = await fetch(`${apiUrl}/user-profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        userProfile = await res.json();
      }
    } catch {
      // Gracefully continue without profile if API is unreachable
    }
  }

  return {
    locale,
    user,
    userProfile,
    accessToken,
    ENV: {
      VITE_API_URL: process.env.VITE_API_URL || "http://localhost:4000",
    },
  };
};

export default function App() {
  const { locale, user, userProfile, ENV } = useLoaderData<typeof loader>();
  const { theme, toggleTheme } = useTheme();
  const { setProfile } = useUserProfile();

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
            __html: `window.ENV = ${JSON.stringify(ENV)};`,
          }}
        />
        {/* Prevent flash of wrong theme by applying class synchronously */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('flump-theme');
                  var theme = (stored === 'light' || stored === 'dark')
                    ? stored
                    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.classList.toggle('dark', theme === 'dark');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        style={{
          backgroundColor: "var(--colors-background)",
          color: "var(--colors-text-primary)",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          minHeight: "100vh",
          transition: "background-color 0.2s ease, color 0.2s ease",
        }}
      >
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
          <ResponsiveProvider>
            <Header />
            <div
              className={css({
                maxWidth: "1536px",
                margin: "0 auto",
                paddingX: { base: "12px", md: "24px" },
              })}
            >
              <main
                className={css({
                  paddingBottom: { base: user ? "72px" : "0", md: "0" },
                })}
              >
                <Outlet />
              </main>
              {Boolean(user) && <MobileBottomBar user={user} />}
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
  // The root boundary replaces the whole document, so it must render html and body itself.
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width,initial-scale=1,viewport-fit=cover" name="viewport" />
        <meta name="color-scheme" content="light dark" />
        <title>Something went wrong</title>
        <Meta />
        <Links />
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
