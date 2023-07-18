import { render } from '@testing-library/react';
import { vi } from 'vitest';

import ColorModeSwitch from './ColorModeSwitch';

vi.mock('@chakra-ui/react');

// mock flp button
vi.mock('./core/buttons/FLPButton', () => ({
  default: (props) => <button>{props.children}</button>
}));

describe('<ColorModeSwitch />', async () => {
  const chakra = await import('@chakra-ui/react');
  chakra.useColorMode = vi
    .fn()
    .mockReturnValueOnce({ ...chakra.useColorMode, colorMode: 'dark' })
    .mockReturnValueOnce({ ...chakra.useColorMode, colorMode: 'light' });
  test('should render as expected when colormode is dark', () => {
    const { baseElement } = render(<ColorModeSwitch />);
    expect(baseElement).toMatchSnapshot();
  });
  test('should render as expected when colormode is light', () => {
    const { baseElement } = render(<ColorModeSwitch />);
    expect(baseElement).toMatchSnapshot();
  });
});
