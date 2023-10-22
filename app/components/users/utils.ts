import type { SupabaseClient } from '@supabase/supabase-js';
import type { TFunction } from 'i18next';

export enum SignUpActionEnum {
  LOGIN = 'logIn',
  SIGNUP = 'signUp'
}

export const getSignUpButtonText = (t: TFunction, isShowLogin: boolean, isMagicLink: boolean) => {
  if (isMagicLink) return t('sendMagicLink');
  if (isShowLogin) return t(SignUpActionEnum.LOGIN);
  return t(SignUpActionEnum.SIGNUP);
};

export const getInfoMessage = (t: TFunction, isUserRegistered: boolean, isMagicLink: boolean) => {
  if (isMagicLink) return t('magicLinkSent');
  if (isUserRegistered) return t('clickAgainToLogIn');
  return null;
}

export const getSubmitUserAuthAction = async ({
  supabaseClient,
  isShowLogin,
  isMagicLink,
  formInput
}: {
  supabaseClient: SupabaseClient;
  isShowLogin: boolean;
  isMagicLink: boolean;
  formInput: { email: string; password: string };
}) => {
  if (isMagicLink)
    return await supabaseClient.auth.signInWithOtp({
      email: formInput.email,
      options: {
        emailRedirectTo: window.location.origin + '/auth/callback'
      }
    });
  if (isShowLogin) return await supabaseClient.auth.signInWithPassword(formInput);
  return await supabaseClient.auth.signUp(formInput);
};
