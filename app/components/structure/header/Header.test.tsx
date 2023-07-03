import { render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import Header from '~/components/structure/header/Header';

vi.mock('~/components/ColorModeSwitch', () => ({
  default: () => <div>ColorModeSwitch</div>
}));

describe('<Header />', () => {
  test('renders as expected', () => {
    const { baseElement } = render(<Header />);
    expect(baseElement).toMatchSnapshot();
  });
});
