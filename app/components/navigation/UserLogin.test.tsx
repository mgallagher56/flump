import { render, renderHook } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { describe, expect, test, vi } from 'vitest';
import UserLogin from '~/components/navigation/UserLogin';
import { useUserStore } from '~/store';

import { mockUser } from '__mocks__/user';

vi.mock('app/components/users/SignOut', () => ({
  default: () => <div>logOut</div>
}));

describe('<UserLogin />', () => {
  test('renders as expected', () => {
    const { baseElement } = render(<UserLogin />);
    expect(baseElement).toMatchSnapshot();
  });
  test('renders signed out when logged in', () => {
    const { setUser } = renderHook(() => useUserStore()).result.current;
    act(() => setUser(mockUser));
    const { getByText } = render(<UserLogin />);
    expect(getByText('logOut')).toBeDefined();
  });
});
