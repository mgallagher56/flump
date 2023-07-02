import type { ReactNode } from 'react';

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ColorModeSwitch from './ColorModeSwitch';

describe('<ColorModeSwitch />', () => {
  it('should render as expected when colormode is dark', () => {
    const { baseElement } = render(<ColorModeSwitch />);
    expect(baseElement).toMatchSnapshot();
    vi.restoreAllMocks();
  });
  it('should render as expected when colormode is light', () => {
    vi.mock('@chakra-ui/react', async () => {
      const actual: Record<string, ReactNode> = await vi.importActual('@chakra-ui/react');
      return {
        ...actual,
        useColorMode: () => ({ colorMode: 'light', toggleColorMode: vi.fn() })
      };
    });
    const { baseElement } = render(<ColorModeSwitch />);
    expect(baseElement).toMatchSnapshot();
  });
});
