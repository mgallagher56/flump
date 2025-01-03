import type { ReactChildren, ReactElement, ReactNode } from 'react';
import { StrictMode, useContext, useEffect, useMemo } from 'react';

import { Box, Container, Heading } from '@chakra-ui/react';
import type { EmotionCache } from '@emotion/react';
import { withEmotionCache } from '@emotion/react';
import type { User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import type { LinksFunction, MetaFunction, UNSAFE_DataWithResponseInit } from 'react-router';
import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRevalidator,
  useRouteError
} from 'react-router';
import { useChangeLanguage } from 'remix-i18next/react';
import { Provider } from '~/components/ui/provider';

import Header from './components/structure/header/Header';
import { useColorMode } from './components/ui/color-mode';
import { ClientStyleContext, ServerStyleContext } from './context';
import i18next from './i18n.server';
import styles from './index.css?url';
import { system } from './theme';
import supabase, { createSupaBaseServerClient } from './utils/supabase';

export const loader = async ({
  request
}: {
  request: Request;
}): Promise<
  UNSAFE_DataWithResponseInit<{
    ENV: {
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    };
    locale: string;
    access_token: string | null;
    user: User | null;
    cookie: string | null;
  }>
> => {
  const locale = await i18next.getLocale(request);

  const response = new Response();
  const supabase = createSupaBaseServerClient(request);

  const {
    data: { session }
  } = await supabase.auth.getSession();

  const { data: userData } = await supabase.auth.getUser();

  return data(
    {
      locale,
      ENV: {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
      },
      access_token: session?.access_token ?? null,
      user: userData?.user ?? null,
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

export const meta: MetaFunction = (): { name?: string; content?: string; title?: string }[] => [{ title: 'Flump' }];

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

const Document = withEmotionCache(({ children }: { children: ReactNode }, emotionCache: EmotionCache): ReactElement => {
  const serverStyleData = useContext(ServerStyleContext);
  const clientStyleData = useContext(ClientStyleContext);
  const loaderData = useLoaderData<typeof loader>();
  const { ENV, locale } = loaderData;
  const { revalidate } = useRevalidator();
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
  }, [clientStyleData]);

  return (
    <html dir={i18n.dir()} lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width,initial-scale=1" name="viewport" />
        <Meta />
        <Links />
        {serverStyleData?.map(({ key, ids, css }) => (
          <style key={key} dangerouslySetInnerHTML={{ __html: css }} data-emotion={`${key} ${ids.join(' ')}`} />
        ))}
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(ENV)}`
          }}
        />
        <Provider>{children}</Provider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
});

export default function App(): ReactElement {
  const { revalidate } = useRevalidator();
  return (
    <StrictMode>
      <Document>
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
        <Header />
        <Box display="flex" justifyContent="center" textAlign="center">
          <Heading as="h1">
            Oops! Something went wrong
            <p> Status: {error.status}</p>
            <p>{error.data.message}</p>
          </Heading>
        </Box>
      </Document>
    );
  }

  return (
    <Document>
      <Header />
      <Box>
        <Heading as="h1" bg="blue.500">
          <h1>Uh oh ...</h1>
          <pre>{error?.data?.message ?? 'Something went wrong'}</pre>{' '}
        </Heading>
      </Box>
    </Document>
  );
}
