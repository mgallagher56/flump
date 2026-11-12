type Env = Record<string, string | undefined>;

export interface SentryPublicEnv {
  SENTRY_DSN: string;
  SENTRY_ENVIRONMENT: string;
  SENTRY_RELEASE: string;
}

/**
 * The Sentry settings shared by the server SDK and the browser (through `window.ENV`).
 * The DSN is public by design. Every key is an empty string when unset.
 */
export function sentryPublicEnv(env: Env): SentryPublicEnv {
  const sha = env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7);
  return {
    SENTRY_DSN: env.SENTRY_DSN?.trim() ?? "",
    SENTRY_ENVIRONMENT: env.SENTRY_ENVIRONMENT || env.RAILWAY_ENVIRONMENT_NAME || "",
    SENTRY_RELEASE: env.SENTRY_RELEASE || sha || "",
  };
}
