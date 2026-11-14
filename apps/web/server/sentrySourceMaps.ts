import { sentryVitePlugin } from "@sentry/vite-plugin";
import type { PluginOption } from "vite";

type Env = Record<string, string | undefined>;

/** Where the client build writes its files; the upload deletes every map under it afterwards. */
export const CLIENT_BUILD_DIR = "build/client";

export interface SentrySourceMapSettings {
  /** Vite `build.sourcemap` for this build. */
  sourcemap: boolean | "hidden";
  plugins: PluginOption[];
}

/**
 * True only when everything an upload needs is present. Local and CI builds have no token, so
 * they skip the upload silently and emit no source maps at all.
 */
export function sentryUploadConfigured(env: Env): boolean {
  return Boolean(
    env.SENTRY_AUTH_TOKEN?.trim() && env.SENTRY_ORG?.trim() && env.SENTRY_PROJECT?.trim(),
  );
}

/**
 * Browser source maps for Sentry (BE-07, audit L14), never shipped publicly:
 * - only the client build (React Router builds client then server; the server bundle is not
 *   uploaded), and only when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` are all set;
 * - maps are `hidden` (no `//# sourceMappingURL` comment in the shipped JS), uploaded by the
 *   Sentry plugin, then deleted from `build/client` so they never reach the image or the server;
 * - `server/noSourceMaps.ts` refuses any `*.map` request as a backstop.
 * Otherwise no maps are generated and no plugin runs.
 */
export function sentrySourceMaps(env: Env, isSsrBuild: boolean): SentrySourceMapSettings {
  if (isSsrBuild || !sentryUploadConfigured(env)) return { sourcemap: false, plugins: [] };
  const release = env.SENTRY_RELEASE?.trim();
  return {
    sourcemap: "hidden",
    plugins: [
      sentryVitePlugin({
        authToken: env.SENTRY_AUTH_TOKEN?.trim(),
        org: env.SENTRY_ORG?.trim(),
        project: env.SENTRY_PROJECT?.trim(),
        ...(env.SENTRY_URL?.trim() ? { url: env.SENTRY_URL.trim() } : {}),
        telemetry: false,
        // A Sentry outage or a bad token must not block a deploy: warn and ship without the
        // upload. Any map left behind is still never served (`server/noSourceMaps.ts`).
        errorHandler: (error) => {
          console.warn(`[sentry] source map upload failed: ${error.message}`);
        },
        // The release is set at runtime (`SENTRY_RELEASE` through `window.ENV`); events match the
        // uploaded maps through the debug ids the plugin injects, so no release is created here
        // unless one is named for the build.
        release: release ? { name: release, inject: false } : { inject: false, create: false },
        sourcemaps: {
          assets: [`./${CLIENT_BUILD_DIR}/**`],
          filesToDeleteAfterUpload: [`./${CLIENT_BUILD_DIR}/**/*.map`],
        },
      }),
    ],
  };
}
