import { act, render, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import NavMenu from '~/components/navigation/NavMenu';
import useUserStore from '~/store';

import { mockUser } from '__mocks__/user';

describe('<NavMenu />', () => {
  test('renders as expected when not logged in', () => {
    const { baseElement } = render(<NavMenu />);
    expect(baseElement).toMatchSnapshot();
  });
  test('renders as expected when logged in', () => {
    const { setUser } = renderHook(() => useUserStore()).result.current;
    act(() => setUser(mockUser));
    const { baseElement } = render(<NavMenu />);
    expect(baseElement).toMatchSnapshot();
  });
});
