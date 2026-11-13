/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/docs/en/main/file-conventions/entry.client
 */

import i18next from "i18next";
import Backend from "i18next-http-backend";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { HydratedRouter } from "react-router/dom";
import { getInitialNamespaces } from "remix-i18next/client";

import i18n from "./i18n";

type ClientEnv = { SENTRY_DSN?: string; SENTRY_ENVIRONMENT?: string; SENTRY_RELEASE?: string };

// Set once the lazy Sentry module has loaded; stays undefined (and no SDK is fetched) without a DSN.
let captureClientError: ((error: unknown) => void) | undefined;

async function startSentry(): Promise<void> {
  const env = (window as unknown as { ENV?: ClientEnv }).ENV;
  if (!env?.SENTRY_DSN) return;
  try {
    const sentry = await import("./observability/sentry.client");
    if (sentry.init(env)) captureClientError = sentry.captureClientError;
  } catch {
    // Error reporting must never stop the app from hydrating.
  }
}

async function hydrate(): Promise<void> {
  if (!i18next.isInitialized)
    await i18next
      .use(initReactI18next)
      .use(Backend)
      .init({
        ...i18n,
        ns: getInitialNamespaces(),
        backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
      });

  // Not awaited: error reporting must never delay hydration.
  void startSentry();

  startTransition(() => {
    hydrateRoot(
      document,
      <I18nextProvider i18n={i18next}>
        <StrictMode>
          <HydratedRouter onError={(error) => captureClientError?.(error)} />
        </StrictMode>
      </I18nextProvider>,
    );
  });
}

if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate);
} else {
  // Safari doesn't support requestIdleCallback
  // https://caniuse.com/requestidlecallback
  window.setTimeout(hydrate, 1);
}
