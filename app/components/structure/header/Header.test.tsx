import { render } from '@testing-library/react';
import { vi } from 'vitest';
import Header from '~/components/structure/header/Header';

import mockUser from '__mocks__/user';

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn()
}));

vi.mock('@remix-run/react', async () => {
  const actual: Record<string, unknown> = await vi.importActual('@remix-run/react');
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
    const { baseElement } = render(<Header showColorModeSwitch={false} />);
    expect(baseElement).toMatchSnapshot();
  });

  test('renders correctly when user logged in', () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { baseElement } = render(<Header />);
    expect(baseElement).toMatchSnapshot();
  });
});
