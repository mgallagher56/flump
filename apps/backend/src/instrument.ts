// Must be the first import in main.ts so Sentry can hook uncaught exceptions early.
// Inert without a DSN: the Sentry module is not even required, so there is no init and no network.
if (process.env.SENTRY_DSN?.trim() && process.env.NODE_ENV !== "test") {
  // biome-ignore lint/style/noCommonJs: conditional require keeps @sentry/node unloaded without a DSN
  require("./observability/sentry").initSentry(process.env);
}
