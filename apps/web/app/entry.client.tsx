/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/docs/en/main/file-conventions/entry.client
 */
import type { ReactElement, ReactNode } from 'react';
import { startTransition, StrictMode, useMemo, useState } from 'react';

import { CacheProvider } from '@emotion/react';
import { RemixBrowser } from '@remix-run/react';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { hydrateRoot } from 'react-dom/client';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { getInitialNamespaces } from 'remix-i18next/client';

import { ClientStyleContext } from './context';
import createEmotionCache, { defaultCache } from './createEmotionCache';
import i18n from './i18n';

interface ClientCacheProviderProps {
  children: ReactNode;
}

function ClientCacheProvider({ children }: ClientCacheProviderProps): ReactElement {
  const [cache, setCache] = useState(defaultCache);

  function reset(): void {
    setCache(createEmotionCache());
  }

  const value = useMemo(() => ({ reset }), []);

  return (
    <ClientStyleContext.Provider value={value}>
      <CacheProvider value={cache}>{children}</CacheProvider>
    </ClientStyleContext.Provider>
  );
}

async function hydrate(): Promise<void> {
  if (!i18next.isInitialized)
    await i18next
      .use(initReactI18next)
      .use(LanguageDetector)
      .use(Backend)
      .init({
        ...i18n,
        ns: getInitialNamespaces(),
        backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
        detection: {
          order: ['htmlTag'],
          caches: []
        }
      });

  startTransition(() => {
    hydrateRoot(
      document,
      <I18nextProvider i18n={i18next}>
        <StrictMode>
          <ClientCacheProvider>
            <RemixBrowser />
          </ClientCacheProvider>
        </StrictMode>
      </I18nextProvider>
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
