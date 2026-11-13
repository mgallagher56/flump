export interface SafeOptionsInput {
  /** v10 option, removed in v11. Tolerated only when absent or `false`. */
  sendDefaultPii?: unknown;
  dataCollection?: unknown;
  tracesSampleRate?: unknown;
  tracesSampler?: unknown;
  profilesSampleRate?: unknown;
  profilesSampler?: unknown;
  profileSessionSampleRate?: unknown;
  profileLifecycle?: unknown;
  enableTracing?: unknown;
  replaysSessionSampleRate?: unknown;
  replaysOnErrorSampleRate?: unknown;
  includeLocalVariables?: unknown;
  integrations?: unknown;
  beforeSend?: unknown;
  beforeBreadcrumb?: unknown;
}

/**
 * The v11 replacement for `sendDefaultPii: false`: every automatic data category switched off.
 * In v11 each of these defaults to ON (see the `dataCollection` option in the Sentry v11
 * migration guide), so each one must be set explicitly. Shared by the backend, the web server
 * and the web client. `assertSafeOptions` enforces exactly this contract.
 */
export const PRIVATE_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [] as never[],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
} as const;

const FORBIDDEN_INTEGRATION = /tracing|replay|feedback|profil/i;

function isPositive(value: unknown): boolean {
  return value !== undefined && value !== null && Number(value) !== 0;
}

function integrationName(integration: unknown): string {
  if (typeof integration === "string") return integration;
  if (typeof integration === "object" && integration !== null) {
    return String((integration as { name?: unknown }).name);
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Every named flag of a nested group must be explicitly `false`. */
function groupIsOff(value: unknown, keys: string[]): boolean {
  return isRecord(value) && keys.every((key) => value[key] === false);
}

/** `httpHeaders` is off as a bare `false` or as `{ request: false, response: false }`. */
function headersAreOff(value: unknown): boolean {
  return value === false || groupIsOff(value, ["request", "response"]);
}

function assertDataCollectionOff(dataCollection: unknown): void {
  if (!isRecord(dataCollection)) fail("dataCollection must be set with every category off");
  const dc = dataCollection;
  if (dc.userInfo !== false) fail("dataCollection.userInfo must be false");
  if (dc.cookies !== false) fail("dataCollection.cookies must be false");
  if (!headersAreOff(dc.httpHeaders)) fail("dataCollection.httpHeaders must be false");
  if (!Array.isArray(dc.httpBodies) || dc.httpBodies.length > 0) {
    fail("dataCollection.httpBodies must be an empty array");
  }
  if (dc.urlQueryParams !== false) fail("dataCollection.urlQueryParams must be false");
  if (!groupIsOff(dc.graphQL, ["document", "variables"]))
    fail("dataCollection.graphQL must be off");
  if (!groupIsOff(dc.genAI, ["inputs", "outputs"])) fail("dataCollection.genAI must be off");
  if (!groupIsOff(dc.mcp, ["inputs", "outputs"])) fail("dataCollection.mcp must be off");
  if (dc.databaseQueryData !== false) fail("dataCollection.databaseQueryData must be false");
  if (dc.queues !== false) fail("dataCollection.queues must be false");
  if (dc.stackFrameVariables !== false) fail("dataCollection.stackFrameVariables must be false");
}

function fail(reason: string): never {
  throw new Error(`Unsafe Sentry options: ${reason}`);
}

/** Throws if Sentry options could leak PII. Used by the Sentry init tests. */
export function assertSafeOptions(opts: SafeOptionsInput): void {
  // v10 option: absent in v11 options, but a lingering `true` (or any non-false value) is rejected.
  if (opts.sendDefaultPii !== undefined && opts.sendDefaultPii !== false) {
    fail("sendDefaultPii must be false");
  }
  assertDataCollectionOff(opts.dataCollection);
  if (isPositive(opts.tracesSampleRate) || opts.tracesSampler !== undefined || opts.enableTracing) {
    fail("tracing must be disabled");
  }
  if (
    isPositive(opts.profilesSampleRate) ||
    opts.profilesSampler !== undefined ||
    isPositive(opts.profileSessionSampleRate) ||
    opts.profileLifecycle !== undefined
  ) {
    fail("profiling must be disabled");
  }
  if (isPositive(opts.replaysSessionSampleRate) || isPositive(opts.replaysOnErrorSampleRate)) {
    fail("session replay must be disabled");
  }
  if (opts.integrations !== undefined) {
    if (!Array.isArray(opts.integrations)) fail("integrations must be an array");
    if (opts.integrations.some((i) => FORBIDDEN_INTEGRATION.test(integrationName(i)))) {
      fail("tracing, replay, feedback and profiling integrations are forbidden");
    }
  }
  if (opts.includeLocalVariables) fail("includeLocalVariables must be off");
  if (typeof opts.beforeSend !== "function") fail("beforeSend must be a function");
  if (typeof opts.beforeBreadcrumb !== "function") fail("beforeBreadcrumb must be a function");
}
