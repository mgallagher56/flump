import { ReactElement, ReactNode, StrictMode, useContext, useEffect, useMemo, useState } from 'react';

import {
  Box,
  ChakraProvider,
  ColorModeScript,
  Container,
  cookieStorageManagerSSR,
  Heading,
  theme
} from '@chakra-ui/react';
import { EmotionCache, withEmotionCache } from '@emotion/react';
import { json, LinksFunction, LoaderFunction, TypedResponse, V2_MetaFunction } from '@remix-run/node';
import {
  isRouteErrorResponse,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRevalidator,
  useRouteError
} from '@remix-run/react';
import { Session } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { useChangeLanguage } from 'remix-i18next';

import { Database } from 'db_types';

import Header from './components/structure/header/Header';
import { ClientStyleContext, ServerStyleContext } from './context';
import i18next from './i18n.server';
import styles from './index.css';
import useUserStore from './store';
import supabase, { createSupaBaseServerClient } from './utils/supabase';

const DEFAULT_COLOR_MODE: 'dark' | 'light' | null = 'dark';
const CHAKRA_COOKIE_COLOR_KEY = 'chakra-ui-color-mode';

function getColorMode(cookie: string) {
  const match = cookie?.match(new RegExp(`(^| )${CHAKRA_COOKIE_COLOR_KEY}=([^;]+)`));
  return match == null ? void 0 : match[2];
}

export const loader = async ({
  request
}: {
  request: Request;
}): Promise<
  TypedResponse<{
    env: {
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    };
    locale: string;
    session: Session | null;
    cookie: string | null;
  }>
> => {
  const locale = await i18next.getLocale(request);
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
  };

  const response = new Response();
  const supabase = createSupaBaseServerClient({ request, response });

  const {
    data: { session }
  } = await supabase.auth.getSession();

  return json(
    {
      locale,
      env,
      session,
      cookie: request?.headers?.get('Cookie') ?? ''
    },
    {
      headers: response.headers
    }
  );
};

export const handle = {
  i18n: ['common']
};

export const meta: V2_MetaFunction = (): { name?: string; content?: string; title?: string }[] => [
  {
    name: 'viewport',
    content: 'width=device-width,initial-scale=1'
  },
  { title: 'flump' }
];

export const links: LinksFunction = (): {
  rel: string;
  href: string;
}[] => {
  return [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap'
    },
    { rel: 'stylesheet', href: styles }
  ];
};

interface DocumentProps {
  children: ReactNode;
  locale?: string;
  colorMode?: string;
  env?: {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  };
  cookie?: string;
}

const Document = withEmotionCache(
  ({ children, cookie, colorMode, env, locale }: DocumentProps, emotionCache: EmotionCache): ReactElement => {
    const serverStyleData = useContext(ServerStyleContext);
    const clientStyleData = useContext(ClientStyleContext);
    const { i18n } = useTranslation();

    // Only executed on client
    useEffect(() => {
      // re-link sheet container
      emotionCache.sheet.container = document.head;
      // re-inject tags
      const tags = emotionCache.sheet.tags;
      emotionCache.sheet.flush();
      tags.forEach((tag) => {
        (emotionCache.sheet as any)._insertTag(tag);
      });
      // reset cache to reapply global styles
      clientStyleData?.reset();
    }, []);

    return (
      <html
        lang={locale}
        dir={i18n.dir()}
        {...(colorMode && {
          'data-theme': colorMode,
          style: { colorScheme: colorMode }
        })}
      >
        <head>
          <meta charSet="utf-8" />
          <Meta />
          <Links />
          {serverStyleData?.map(({ key, ids, css }) => (
            <style key={key} data-emotion={`${key} ${ids.join(' ')}`} dangerouslySetInnerHTML={{ __html: css }} />
          ))}
        </head>
        <body
          {...(colorMode && {
            className: `chakra-ui-${colorMode}`
          })}
        >
          <ColorModeScript initialColorMode={theme.config.initialColorMode} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.env = ${JSON.stringify(env)}`
            }}
          />
          <ChakraProvider colorModeManager={cookieStorageManagerSSR(cookie)} theme={theme}>
            {children}
          </ChakraProvider>
          <ScrollRestoration />
          <Scripts />
          <LiveReload />
        </body>
      </html>
    );
  }
);

export default function App(): ReactElement {
  const { revalidate } = useRevalidator();
  let { cookie = '', env, locale, session } = useLoaderData<typeof loader>();
  const serverAccessToken = session?.access_token;
  const setUser = useUserStore((state) => state.setUser);

  if (typeof document !== 'undefined') {
    cookie = document.cookie;
  }

  let colorMode = useMemo(() => {
    let color = getColorMode(cookie);

    if (!color && DEFAULT_COLOR_MODE) {
      cookie += ` ${CHAKRA_COOKIE_COLOR_KEY}=${DEFAULT_COLOR_MODE}`;
      color = DEFAULT_COLOR_MODE;
    }

    return color;
  }, [cookie]);

  useChangeLanguage(locale);

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION' && session?.access_token !== serverAccessToken) {
        setUser(session?.user ?? null);
        // server and client are out of sync
        revalidate();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [serverAccessToken]);

  return (
    <StrictMode>
      <Document locale={locale} colorMode={colorMode} env={env} cookie={cookie}>
        <Container maxW={'container.xl'}>
          <Header />
          <Outlet />
        </Container>
      </Document>
    </StrictMode>
  );
}

export function ErrorBoundary(): ReactElement {
  const error = useRouteError() as {
    status: number;
    data: {
      message: string;
    };
  };
  if (isRouteErrorResponse(error)) {
    return (
      <Document>
        <Header showSignIn={false} />
        <Box>
          <Heading as="h1" bg="blue.500">
            <h1>Oops</h1>
            <p>Status: {error.status}</p>
            <p>{error.data.message}</p>
          </Heading>
        </Box>
      </Document>
    );
  }

  return (
    <Document>
      <Box>
        <Heading as="h1" bg="blue.500">
          <h1>Uh oh ...</h1>
          <pre>{error?.data?.message ?? 'Something went wrong'}</pre>{' '}
        </Heading>
      </Box>
    </Document>
  );
}
