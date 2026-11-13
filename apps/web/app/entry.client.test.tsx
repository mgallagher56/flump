import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const init = vi.fn(() => true);
const captureClientError = vi.fn();
const sentryModuleLoaded = vi.fn();
const hydrateRoot = vi.fn();
const routerProps: { onError?: (error: unknown) => void }[] = [];

vi.mock("./observability/sentry.client", () => {
  sentryModuleLoaded();
  return { init, captureClientError };
});
vi.mock("react-dom/client", () => ({ hydrateRoot }));
vi.mock("react-router/dom", () => ({
  HydratedRouter: (props: { onError?: (error: unknown) => void }) => {
    routerProps.push(props);
    return null;
  },
}));
vi.mock("i18next", () => ({
  default: { isInitialized: true, use: vi.fn() },
}));
vi.mock("i18next-http-backend", () => ({ default: {} }));
vi.mock("react-i18next", () => ({
  I18nextProvider: ({ children }: { children: unknown }) => children,
  initReactI18next: {},
}));
vi.mock("remix-i18next/client", () => ({ getInitialNamespaces: () => [] }));

type TestWindow = {
  ENV?: Record<string, string>;
  requestIdleCallback?: (cb: () => void) => void;
};

async function boot(env: Record<string, string> | undefined) {
  vi.resetModules();
  const w = window as unknown as TestWindow;
  w.ENV = env;
  w.requestIdleCallback = (cb) => void cb();
  await import("./entry.client");
  await vi.waitFor(() => expect(hydrateRoot).toHaveBeenCalledOnce());
}

describe("entry.client Sentry wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerProps.length = 0;
  });
  afterEach(() => {
    (window as unknown as TestWindow).ENV = undefined;
  });

  it("does not load or init the Sentry module without a DSN", async () => {
    await boot({ SENTRY_DSN: "", SENTRY_ENVIRONMENT: "", SENTRY_RELEASE: "" });
    expect(sentryModuleLoaded).not.toHaveBeenCalled();
    expect(init).not.toHaveBeenCalled();
  });

  it("does not load the Sentry module when window.ENV is missing", async () => {
    await boot(undefined);
    expect(sentryModuleLoaded).not.toHaveBeenCalled();
  });

  it("positive control: loads and inits the module with a DSN, and routes errors to it", async () => {
    const env = { SENTRY_DSN: "http://public@127.0.0.1:9/1", SENTRY_ENVIRONMENT: "staging" };
    await boot(env);
    await vi.waitFor(() => expect(init).toHaveBeenCalledExactlyOnceWith(env));
    expect(sentryModuleLoaded).toHaveBeenCalledOnce();

    // hydrateRoot received the element tree; render it shallowly to reach HydratedRouter's props.
    // Tree: NonceProvider > I18nextProvider > StrictMode > HydratedRouter.
    const element = hydrateRoot.mock.calls[0]?.[1] as {
      props: {
        children: {
          props: {
            children: { props: { children: { props: { onError: (e: unknown) => void } } } };
          };
        };
      };
    };
    const router = element.props.children.props.children.props.children;
    const error = new Error("render failed");
    await vi.waitFor(() => {
      router.props.onError(error);
      expect(captureClientError).toHaveBeenCalled();
    });
    expect(captureClientError).toHaveBeenCalledExactlyOnceWith(error);
  });
});
