import type { ReactNode } from 'react';

import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useUserStore from '~/store';
import { AuthErrorEnums } from '~/utils/utils';

import { mockUser } from '__mocks__/user';

import SignUp from './SignUp';

const mocks = vi.hoisted(() => ({
  signUpSpy: vi.fn(() => ({
    data: { message: 'sign up success' },
    error: { message: AuthErrorEnums.USER_ALREADY_REGISTERED }
  })),
  signOutSpy: vi.fn(),
  signInWithPasswordSpy: vi.fn(() => ({
    data: { message: 'sign in success' },
    error: { message: 'sign in error' }
  }))
}));

vi.mock('app/utils/supabase', () => ({
  default: {
    auth: {
      signUp: mocks.signUpSpy,
      signInWithPassword: mocks.signInWithPasswordSpy,
      signOut: mocks.signOutSpy
    }
  }
}));

vi.mock('app/components/users/SignOut', () => ({
  default: () => <div>SignOut</div>
}));

vi.mock('@remix-run/react', async () => {
  const actual: Record<string, unknown> = await vi.importActual('@remix-run/react');
  return {
    ...actual,
    Form: ({ children, onSubmit }: { children: ReactNode; onSubmit }) => <form onSubmit={onSubmit}>{children}</form>,
    useRouteData: () => ({})
  };
});

const mockEmail = 'test@test.com';
const mockPassword = 'password';

describe('<SignUp />', () => {
  it('should render as expected', () => {
    const { container } = render(<SignUp />);
    expect(container).toMatchSnapshot();
  });

  const renderAndType = async ({ action }: { action: 'signup' | 'login' }) => {
    const { getByLabelText, getByText } = render(<SignUp action={action} />);
    const emailInput = getByLabelText('Email:') as HTMLInputElement;
    const passwordInput = getByLabelText('Password:') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: mockEmail } });
    fireEvent.change(passwordInput, { target: { value: mockPassword } });

    await waitFor(() => {
      expect(emailInput.value).toBe(mockEmail);
      expect(passwordInput.value).toBe(mockPassword);
    });

    return { getByLabelText, getByText, passwordInput };
  };

  it('should submit the form after typing and pressing enter', async () => {
    const { passwordInput } = await renderAndType({ action: 'signup' });

    fireEvent.keyUp(passwordInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mocks.signUpSpy).toHaveBeenCalled();
    });
  });

  it('should submit the form and call login function after typing and clicking the button', async () => {
    const { getByText } = await renderAndType({ action: 'login' });

    const submitButton = getByText('logIn') as HTMLButtonElement;
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mocks.signInWithPasswordSpy).toHaveBeenCalled();
    });
  });

  it('should render the sign out button if user is logged in', () => {
    const { setUser } = renderHook(() => useUserStore()).result.current;
    act(() => setUser(mockUser));
    const { getByText } = render(<SignUp action="signup" />);
    const signOutButton = getByText('SignOut');
    expect(signOutButton).toBeDefined();
  });
});
