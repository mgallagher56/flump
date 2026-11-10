import type { Preview } from "@storybook/react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "../public/locales/en/common.json";
import { StorybookRouterContext } from "./react-router-mock";
import "../app/index.css";

// Initialize i18next for Storybook
i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
    },
  },
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Theme selector for components",
      defaultValue: "side-by-side",
      toolbar: {
        title: "Theme Mode",
        icon: "circlehollow",
        items: [
          { value: "side-by-side", title: "Side-by-Side (Light & Dark)", icon: "mirror" },
          { value: "light", title: "Light Mode", icon: "sun" },
          { value: "dark", title: "Dark Mode", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: "color-contrast",
            enabled: true,
          },
        ],
      },
    },
    backgrounds: {
      default: "canvas",
      values: [
        {
          name: "canvas",
          value: "#f8fafc",
        },
        {
          name: "dark",
          value: "#0B0F17",
        },
      ],
    },
  },
  decorators: [
    (Story, context) => {
      const selectedTheme = context.globals.theme || "side-by-side";
      const routerParams = context.parameters.router || {};
      const routerValue = {
        loaderData: routerParams.loaderData || {},
        fetcher: routerParams.fetcher || {
          submit: () => {},
          state: routerParams.fetcherState || "idle",
          Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
        },
        navigate: () => {},
      };

      if (selectedTheme === "side-by-side") {
        return (
          <StorybookRouterContext.Provider value={routerValue}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                minHeight: "100vh",
                width: "100%",
                fontFamily: "var(--fonts-sans, 'Inter', sans-serif)",
              }}
            >
              {/* Light Mode Pane */}
              <div
                data-theme="light"
                style={{
                  backgroundColor: "var(--colors-surface-canvas)",
                  color: "var(--colors-text-primary)",
                  padding: "24px",
                  borderRight: "1px solid var(--colors-border)",
                  minHeight: "100vh",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--colors-text-muted)",
                    marginBottom: "16px",
                  }}
                >
                  ☀️ Light Mode (surface.canvas)
                </div>
                <Story />
              </div>

              {/* Dark Mode Pane */}
              <div
                className="dark"
                data-theme="dark"
                style={{
                  backgroundColor: "var(--colors-surface-canvas)",
                  color: "var(--colors-text-primary)",
                  padding: "24px",
                  minHeight: "100vh",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--colors-text-muted)",
                    marginBottom: "16px",
                  }}
                >
                  🌙 Dark Mode (surface.canvas)
                </div>
                <Story />
              </div>
            </div>
          </StorybookRouterContext.Provider>
        );
      }

      const isDark = selectedTheme === "dark";

      return (
        <StorybookRouterContext.Provider value={routerValue}>
          <div
            className={isDark ? "dark" : ""}
            data-theme={isDark ? "dark" : "light"}
            style={{
              fontFamily: "var(--fonts-sans, 'Inter', sans-serif)",
              backgroundColor: "var(--colors-surface-canvas)",
              color: "var(--colors-text-primary)",
              padding: "24px",
              minHeight: "100vh",
            }}
          >
            <Story />
          </div>
        </StorybookRouterContext.Provider>
      );
    },
  ],
};

export default preview;
