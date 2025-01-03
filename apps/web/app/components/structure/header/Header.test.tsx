import { render } from '@testing-library/react';
import { vi } from 'vitest';

import mockUser from '__mocks__/user';

import Header from './Header';

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn()
}));

vi.mock('react-router', async () => {
  const actual: Record<string, unknown> = await vi.importActual('react-router');
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData
  };
});

vi.mock('app/components/ColorModeSwitch', () => ({
  default: () => <div>ColorModeSwitch</div>
}));

vi.mock('app/components/navigation/UserLogin', () => ({
  default: () => <div>UserLogin</div>
}));

vi.mock('app/components/navigation/NavMenu', () => ({
  default: ({ routes }) => routes.map(({ key }) => <div key={key}>{key}</div>)
}));

vi.mock('app/components/navigation/HomeLogo', () => ({
  default: () => <div>HomeLogo</div>
}));

describe('<Header />', () => {
  test('renders as expected by default', () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: undefined });
    const { baseElement } = render(<Header />);
    expect(baseElement).toMatchSnapshot();
  });
  test('renders without ColorModeSwitch', () => {
    const { baseElement } = render(<Header />);
    expect(baseElement).toMatchSnapshot();
  });

  test('renders correctly when user logged in', () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { baseElement } = render(<Header />);
    expect(baseElement).toMatchSnapshot();
  });
});
