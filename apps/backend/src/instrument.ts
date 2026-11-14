// Must be the first import in main.ts so Sentry can hook uncaught exceptions early.
// Inert without a DSN: the Sentry module is not even required, so there is no init and no network.
// The one deliberate pre-validation read (M18): Sentry has to start before the env schema runs so a
// config failure is still reported. A malformed SENTRY_DSN then fails the schema check at boot.
if (process.env.SENTRY_DSN?.trim() && process.env.NODE_ENV !== "test") {
  // biome-ignore lint/style/noCommonJs: conditional require keeps @sentry/node unloaded without a DSN
  require("./observability/sentry").initSentry(process.env);
}
