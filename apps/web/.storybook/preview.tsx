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
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
    backgrounds: {
      default: "dark",
      values: [
        {
          name: "dark",
          value: "#16181D",
        },
      ],
    },
  },
  decorators: [
    (Story, context) => {
      // Mock router configuration using story parameters
      const routerParams = context.parameters.router || {};
      const routerValue = {
        loaderData: routerParams.loaderData || {},
        fetcher: routerParams.fetcher || {
          submit: (_data: any, _options: any) => {
            // mock: no-op
          },
          state: routerParams.fetcherState || "idle",
          Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
        },
        navigate: (_to: string) => {
          // mock: no-op
        },
      };

      return (
        <StorybookRouterContext.Provider value={routerValue}>
          <div
            style={{
              fontFamily: "Poppins, sans-serif",
              color: "#ffffff",
              padding: "2rem",
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
