import type { ReactNode } from 'react';

import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthErrorEnums } from '~/utils/utils';

import SignUp from './SignUp';
import { SignUpActionEnum } from './utils';

const mocks = vi.hoisted(() => ({
  signUpSpy: vi.fn(() => ({
    data: { message: 'sign up success' },
    error: { message: AuthErrorEnums.USER_ALREADY_REGISTERED }
  })),
  signOutSpy: vi.fn(),
  signInWithPasswordSpy: vi.fn(() => ({
    data: { message: 'sign in success' },
    error: { message: 'sign in error' }
  })),
  signInWithOtp: vi.fn(() => ({
    data: {
      user: {
        confirmation_sent_at: '2021-10-10T10:10:10.000Z'
      }
    },
    error: {}
  }))
}));

vi.mock('app/utils/supabase', () => ({
  default: {
    auth: {
      signUp: mocks.signUpSpy,
      signInWithPassword: mocks.signInWithPasswordSpy,
      signOut: mocks.signOutSpy,
      signInWithOtp: mocks.signInWithOtp
    }
  }
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

  const renderAndType = async ({ action }: { action: SignUpActionEnum }) => {
    const { getByLabelText, getByText, baseElement } = render(<SignUp action={action} />);
    const emailInput = getByLabelText('Email:') as HTMLInputElement;
    const passwordInput = getByLabelText('Password:') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: mockEmail } });
    fireEvent.change(passwordInput, { target: { value: mockPassword } });

    await waitFor(() => {
      expect(emailInput.value).toBe(mockEmail);
      expect(passwordInput.value).toBe(mockPassword);
    });

    return { baseElement, getByLabelText, getByText, passwordInput };
  };

  it('should submit the form after typing and pressing enter. Should change to login button when user is already registered', async () => {
    const { getByText, passwordInput } = await renderAndType({ action: SignUpActionEnum.SIGNUP });

    fireEvent.keyUp(passwordInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mocks.signUpSpy).toHaveBeenCalled();
      expect(getByText('clickAgainToLogIn')).toBeDefined();
    });
  });

  it('should submit the form and call login function after typing and clicking the button', async () => {
    const { getByText } = await renderAndType({ action: SignUpActionEnum.LOGIN });

    const submitButton = getByText('logIn') as HTMLButtonElement;
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mocks.signInWithPasswordSpy).toHaveBeenCalled();
    });
  });

  it('should show email confirmation message when userdata contains confirmation_sent_at param', async () => {
    const { getByText } = await renderAndType({ action: SignUpActionEnum.LOGIN });
    const magicLinkBtn = getByText('loginWithMagicLink') as HTMLButtonElement;
    const submitButton = getByText('logIn') as HTMLButtonElement;

    act(() => {
      magicLinkBtn.click();
    });

    act(() => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mocks.signInWithOtp).toHaveBeenCalled();
      expect(getByText('confirmEmailMsg')).toBeDefined();
    });
  });
});
