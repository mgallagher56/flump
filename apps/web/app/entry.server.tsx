import { CacheProvider as EmotionCacheProvider } from '@emotion/react';
import createEmotionServer from '@emotion/server/create-instance';
import { createInstance } from 'i18next';
import Backend from 'i18next-fs-backend';
import { isbot } from 'isbot';
import { resolve } from 'node:path';
import { renderToPipeableStream } from 'react-dom/server';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import type { EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';
import { PassThrough } from 'stream';

import { createReadableStreamFromReadable } from '@react-router/node';

import createEmotionCache from './createEmotionCache';
import i18n from './i18n';
import i18next from './i18n.server';

// Reject/cancel all pending promises after 5 seconds
export const streamTimeout = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext
): Promise<unknown> {
  const callbackName = isbot(request.headers.get('user-agent')) ? 'onAllReady' : 'onShellReady';

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
      backend: { loadPath: resolve('./public/locales/{{lng}}/{{ns}}.json') }
    });

  return new Promise((resolve, reject) => {
    let didError = false;
    const emotionCache = createEmotionCache();

    const { pipe, abort } = renderToPipeableStream(
      <I18nextProvider i18n={instance}>
        <EmotionCacheProvider value={emotionCache}>
          <ServerRouter context={reactRouterContext} url={request.url} />
        </EmotionCacheProvider>
      </I18nextProvider>,
      {
        [callbackName]: () => {
          const reactBody = new PassThrough();
          const emotionServer = createEmotionServer(emotionCache);

          const bodyWithStyles = emotionServer.renderStylesToNodeStream() as PassThrough;
          reactBody.pipe(bodyWithStyles);

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(createReadableStreamFromReadable(bodyWithStyles), {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode
            })
          );

          pipe(reactBody);
        },
        onShellError: (error: unknown) => {
          reject(error);
        },
        onError: (error: unknown) => {
          didError = true;

          console.error(error);
        }
      }
    );

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents
    setTimeout(abort, streamTimeout + 1000);
  });
}
