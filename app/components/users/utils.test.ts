import type { TFunction } from 'i18next';
import { describe, expect, it, vi } from 'vitest';
import supabase from '~/utils/supabase';

import { getSignUpButtonText, getSubmitUserAuthAction, SignUpActionEnum } from './utils';

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOtp: vi.fn()
}));

vi.mock('app/utils/supabase', () => ({
  default: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      signInWithOtp: mocks.signInWithOtp
    }
  }
}));

const mockTFunction = (key: string) => key;

describe('getSignUpButtonText()', () => {
  it('should return the correct text for the sign up button', () => {
    expect(getSignUpButtonText(mockTFunction as TFunction, true, false)).toBe(SignUpActionEnum.LOGIN);
    expect(getSignUpButtonText(mockTFunction as TFunction, false, false)).toBe(SignUpActionEnum.SIGNUP);
    expect(getSignUpButtonText(mockTFunction as TFunction, false, true)).toBe('sendMagicLink');
    expect(getSignUpButtonText(mockTFunction as TFunction, true, true)).toBe('sendMagicLink');
  });
});

describe('getSubmitUserAuthAction()', () => {
  it('should call the correct function depending on the arguments', async () => {
    const supabaseClient = supabase;
    const formInput = { email: 'test@test.com', password: 'test' };
    await getSubmitUserAuthAction({
      supabaseClient,
      isShowLogin: true,
      isMagicLink: false,
      formInput
    });
    expect(supabaseClient.auth.signInWithPassword).toHaveBeenCalledWith(formInput);
    await getSubmitUserAuthAction({
      supabaseClient,
      isShowLogin: false,
      isMagicLink: false,
      formInput
    });
    expect(supabaseClient.auth.signUp).toHaveBeenCalledWith(formInput);
    await getSubmitUserAuthAction({
      supabaseClient,
      isShowLogin: false,
      isMagicLink: true,
      formInput
    });
    expect(supabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
      email: formInput.email,
      options: {
        emailRedirectTo: window.location.origin + '/auth/callback'
      }
    });
  });
});
