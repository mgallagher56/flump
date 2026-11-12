import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

const __dirname = dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: [
    "../app/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../../../packages/ui/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../../../apps/marketing/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    getAbsolutePath("@chromatic-com/storybook"),
    getAbsolutePath("@storybook/addon-vitest"),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-mcp"),
  ],
  framework: {
    name: getAbsolutePath("@storybook/react-vite") as "@storybook/react-vite",
    options: {},
  },
  staticDirs: ["../public"],
  async viteFinal(config) {
    return {
      ...config,
      optimizeDeps: {
        ...config.optimizeDeps,
        include: [...(config.optimizeDeps?.include ?? []), "react-router-real"],
      },
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          "~": resolve(__dirname, "../app"),
          "react-router-real": resolve(
            __dirname,
            "../node_modules/react-router/dist/development/index.mjs",
          ),
          "react-router": resolve(__dirname, "./react-router-mock.tsx"),
          "react-router-dom": resolve(__dirname, "./react-router-mock.tsx"),
          // Stories in apps/marketing and packages/ui cannot resolve `storybook/test` themselves
          // (they do not depend on storybook), so pin both spellings to the one copy.
          "@storybook/test": resolve(__dirname, "../node_modules/storybook/dist/test/index.js"),
          "storybook/test": resolve(__dirname, "../node_modules/storybook/dist/test/index.js"),
        },
      },
    };
  },
};

export default config;
