import { render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import Header from '~/components/structure/header/Header';

vi.mock('~/components/ColorModeSwitch', () => ({
  default: () => <div>ColorModeSwitch</div>
}));

describe('<Header />', () => {
  test('renders as expected when not in app route', () => {
    const { baseElement } = render(<Header />);
    expect(baseElement).toMatchSnapshot();
  });

  test('renders without ColorModeSwitch', () => {
    const { baseElement } = render(<Header showColorModeSwitch={false} />);
    expect(baseElement).toMatchSnapshot();
  });

  test('renders as expected when in app route', () => {
    Object.defineProperty(window.location, 'pathname', {
      value: '/app'
    });
    const { baseElement } = render(<Header />);
    expect(baseElement).toMatchSnapshot();
  });
});
