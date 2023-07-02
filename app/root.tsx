import { ReactElement, ReactNode, StrictMode, useContext, useEffect } from 'react';

import { Box, ChakraProvider, Container, Heading } from '@chakra-ui/react';
import { EmotionCache, withEmotionCache } from '@emotion/react';
import { json, LinksFunction, V2_MetaFunction } from '@remix-run/node';
import {
  isRouteErrorResponse,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError
} from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import { useChangeLanguage } from 'remix-i18next';

import FLPBox from './components/core/structure/FLPBox';
import Header from './components/structure/header/Header';
import { ClientStyleContext, ServerStyleContext } from './context';
import i18next from './i18n.server';

export const loader = async ({
  request
}: {
  request: Request;
}): Promise<{
  env: {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
  };
  locale: string;
}> => {
  const locale = await i18next.getLocale(request);
  return {
    locale,
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    }
  };
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
    }
  ];
};

interface DocumentProps {
  children: ReactNode;
}

const Document = withEmotionCache(({ children }: DocumentProps, emotionCache: EmotionCache): ReactElement => {
  const serverStyleData = useContext(ServerStyleContext);
  const clientStyleData = useContext(ClientStyleContext);
  const { env, locale } = useLoaderData<typeof loader>();

  const { i18n } = useTranslation();

  useChangeLanguage(locale);

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
    <html lang={locale} dir={i18n.dir()}>
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
        {serverStyleData?.map(({ key, ids, css }) => (
          <style key={key} data-emotion={`${key} ${ids.join(' ')}`} dangerouslySetInnerHTML={{ __html: css }} />
        ))}
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.env = ${JSON.stringify(env)}`
          }}
        />
        {children}
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
});

export default function App(): ReactElement {
  return (
    <StrictMode>
      <Document>
        <ChakraProvider>
          <Container maxW={'container.xl'}>
            <Header />
            <Outlet />
          </Container>
        </ChakraProvider>
      </Document>
    </StrictMode>
  );
}

// How ChakraProvider should be used on ErrorBoundary
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
        <ChakraProvider>
          <Box>
            <Heading as="h1" bg="blue.500">
              <h1>Oops</h1>
              <p>Status: {error.status}</p>
              <p>{error.data.message}</p>
            </Heading>
          </Box>
        </ChakraProvider>
      </Document>
    );
  }

  return (
    <Document>
      <ChakraProvider>
        <Box>
          <Heading as="h1" bg="blue.500">
            <h1>Uh oh ...</h1>
            <p>Something went wrong.</p>
            <pre>{error?.data?.message ?? 'Something went wrong'}</pre>{' '}
          </Heading>
        </Box>
      </ChakraProvider>
    </Document>
  );
}
