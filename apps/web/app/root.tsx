import { css } from "@repo/ui/styled-system/css";
import { useEffect } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "react-router";
import Header from "./components/structure/header/Header";
import { ResponsiveProvider } from "./context/ResponsiveContext";
import { useTheme } from "./hooks/useTheme";
import type { UserProfile } from "./hooks/useUserProfile";
import { useUserProfile } from "./hooks/useUserProfile";
import i18next from "./i18n.server";
import styles from "./index.css?url";
import { ThemeContext } from "./ThemeContext";
import { getAuthSession } from "./utils/utils";

export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap",
  },
  { rel: "stylesheet", href: styles },
];

export const loader = async (args: LoaderFunctionArgs) => {
  const locale = await i18next.getLocale(args.request);
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: false });
  let userProfile: UserProfile | null = null;

  if (user) {
    try {
      const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
      const res = await fetch(`${apiUrl}/user-profile`, {
        headers: { Authorization: `Bearer ${accessToken || "mock-session-token"}` },
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
          fontFamily: "Poppins, sans-serif",
          margin: 0,
          minHeight: "100vh",
          transition: "background-color 0.2s ease, color 0.2s ease",
        }}
      >
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
          <ResponsiveProvider>
            <div
              className={css({
                maxWidth: "1536px",
                margin: "0 auto",
                paddingX: { base: "12px", md: "24px" },
              })}
            >
              <Header />
              <main>
                <Outlet />
              </main>
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
  return (
    <html lang="en">
      <head>
        <title>Oops! Something went wrong</title>
        <Meta />
        <Links />
      </head>
      <body
        style={{
          backgroundColor: "var(--colors-background)",
          color: "var(--colors-text-primary)",
          fontFamily: "Poppins, sans-serif",
          padding: "50px",
          textAlign: "center",
        }}
      >
        <h1>Uh oh... Something went wrong</h1>
        <p>An unexpected error occurred. Please try reloading the page.</p>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
