import { type ReactNode } from 'react';

import { type LinkProps } from '@chakra-ui/react';
import { configure } from '@testing-library/react';

if (!global.window) global.window = {} as any;
Object.defineProperty(window, 'env', {
  value: {
    SUPABASE_URL: 'http://localhost:8000',
    SUPABASE_ANON_KEY: 'anon-key'
  }
});

vi.mock('react-router', async () => {
  const actual: Record<string, unknown> = await vi.importActual('@remix-run/react');
  return {
    ...actual,
    Link: (props: LinkProps): ReactNode => props.children
  };
});

vi.mock('react-i18next', () => ({
  Trans: ({ children }) => children,
  useTranslation: () => {
    return {
      t: (str: string) => str,
      i18n: {
        changeLanguage: () => new Promise(() => ({}))
      }
    };
  }
}));

configure({ testIdAttribute: 'id' });

afterEach(() => {
  vi.clearAllMocks();
});
