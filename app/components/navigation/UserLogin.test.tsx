import { render } from '@testing-library/react';
import { vi } from 'vitest';
import UserLogin from '~/components/navigation/UserLogin';

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

vi.mock('app/components/users/SignOut', () => ({
  default: () => <div>logOut</div>
}));

vi.mock('app/components/core/buttons/FLPLinkButton', () => ({
  default: (props) => <div>{props.children}</div>
}));

describe('<UserLogin />', () => {
  test('renders as expected when user not logged in', () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: undefined });
    const { baseElement } = render(<UserLogin />);
    expect(baseElement).toMatchSnapshot();
  });
  test('renders signed out when logged in', () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { getByText } = render(<UserLogin />);
    expect(getByText('logOut')).toBeDefined();
  });
});
