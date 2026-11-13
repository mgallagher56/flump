import { resolve } from "node:path";
import { PassThrough } from "node:stream";
import { assertLaunchReady } from "@flump/business-details";
import { createReadableStreamFromReadable } from "@react-router/node";
import { createInstance } from "i18next";
import Backend from "i18next-fs-backend";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { I18nextProvider, initReactI18next } from "react-i18next";
import type { EntryContext, RouterContextProvider } from "react-router";
import { ServerRouter } from "react-router";

import i18n from "./i18n";
import i18next from "./i18n.server";
import { reportServerError } from "./observability/sentry.server";
import { nonceContext } from "./security/csp.server";
import { applyCachePolicy, applySecurityHeaders } from "./security/headers.server";
import { NonceProvider } from "./security/nonce";
import { applyRobotsHeader } from "./utils/indexing.server";

// Public launch (indexing allowed) must not boot with placeholder business details.
assertLaunchReady(process.env);

// Loader, action and middleware errors (render errors go through onError below).
export function handleError(error: unknown, { request }: { request: Request }): void {
  reportServerError(error, request);
}

// Runs on every `.data` response. Single-fetch builds some of them outside the middleware
// pipeline (its own CSRF 400, last-resort 500), which would otherwise miss these headers.
export function handleDataRequest(response: Response): Response {
  return applySecurityHeaders(applyCachePolicy(response));
}

// Reject/cancel all pending promises after 5 seconds
export const streamTimeout = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  loadContext: RouterContextProvider,
): Promise<unknown> {
  // Written by the root middleware (E20-N11); empty only if the middleware did not run.
  const nonce = loadContext.get(nonceContext);
  const callbackName = isbot(request.headers.get("user-agent")) ? "onAllReady" : "onShellReady";

  const instance = createInstance();
  const lng = await i18next.getLocale(request);
  const ns = i18next.getRouteNamespaces(reactRouterContext);

  await instance
    .use(initReactI18next)
    .use(Backend)
    .init({
      ...i18n,
      lng,
      ns,
      backend: { loadPath: resolve("./public/locales/{{lng}}/{{ns}}.json") },
    });

  return new Promise((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      <NonceProvider nonce={nonce}>
        <I18nextProvider i18n={instance}>
          <ServerRouter context={reactRouterContext} url={request.url} nonce={nonce} />
        </I18nextProvider>
      </NonceProvider>,
      {
        nonce,
        [callbackName]: () => {
          const reactBody = new PassThrough();

          responseHeaders.set("Content-Type", "text/html");
          // Covers every HTML document response (including error boundaries). Data
          // (.data) requests and resource routes skip entry.server, so resource
          // routes call applyRobotsHeader themselves; data responses are not indexable
          // documents, so no root `headers` export is needed.
          applyRobotsHeader(responseHeaders);

          resolve(
            new Response(createReadableStreamFromReadable(reactBody), {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode,
            }),
          );

          pipe(reactBody);
        },
        onShellError: (error: unknown) => {
          reject(error);
        },
        onError: (error: unknown) => {
          didError = true;

          // Logs only a safe summary (E20-N3) and captures when Sentry is initialised (E18-N3).
          reportServerError(error, request);
        },
      },
    );

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents
    setTimeout(abort, streamTimeout + 1000);
  });
}
