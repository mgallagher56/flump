import customRender from '~/testUtils/customRender';

import { vi } from 'vitest';

import mockUser from '__mocks__/user';

import UserLogin from './UserLogin';

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

vi.mock('app/components/users/SignOut', () => ({
  default: () => <div>logOut</div>
}));

vi.mock('app/components/core/buttons/FLPLinkButton', () => ({
  default: (props) => <div>{props.children}</div>
}));

describe('<UserLogin />', () => {
  test('renders as expected when user not logged in', () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: undefined });
    const { baseElement } =customRender(<UserLogin />);
    expect(baseElement).toMatchSnapshot();
  });
  test('renders signed out when logged in', () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { getByText } =customRender(<UserLogin />);
    expect(getByText('logOut')).toBeDefined();
  });
});
