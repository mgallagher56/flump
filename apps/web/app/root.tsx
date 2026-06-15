import type { LoaderFunctionArgs } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "react-router";
import Header from "./components/structure/header/Header";
import { useTheme } from "./hooks/useTheme";
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
  const { user } = await getAuthSession(args, { ensureSignedIn: false });
  return {
    locale,
    user,
  };
};

export default function App() {
  const { locale } = useLoaderData<typeof loader>();
  const { theme, toggleTheme } = useTheme();

  return (
    <html className={theme === "dark" ? "dark" : ""} data-theme={theme} lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width,initial-scale=1" name="viewport" />
        <Meta />
        <Links />
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
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px" }}>
            <Header />
            <main>
              <Outlet />
            </main>
          </div>
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
