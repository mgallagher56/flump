import { ReactNode } from 'react';

import { LinkProps } from '@chakra-ui/react';

if (!global.window) global.window = {} as any;
Object.defineProperty(window, 'env', {
  value: {
    SUPABASE_URL: 'http://localhost:8000',
    SUPABASE_ANON_KEY: 'anon-key'
  }
});

vi.mock('@remix-run/react', () => ({
  Link: (props: LinkProps): ReactNode => props.children
}));

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
