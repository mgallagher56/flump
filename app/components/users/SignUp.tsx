import type { ChangeEvent, FC, KeyboardEvent } from 'react';
import { useCallback, useState } from 'react';

import { Form } from '@remix-run/react';
import type { AuthTokenResponse } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import useUserStore from '~/store';
import supabase from '~/utils/supabase';
import { AuthErrorEnums } from '~/utils/utils';

import FLPButton from '../core/buttons/FLPButton';
import FLPInput from '../core/input/FLPInput';
import FLPBox from '../core/structure/FLPBox';
import FLPText from '../core/typography/FLPText';
import SignOut from './SignOut';

const { USER_ALREADY_REGISTERED } = AuthErrorEnums;

interface SignUpProps {
  action?: 'login' | 'signup';
}

const SignUp: FC<SignUpProps> = ({ action = 'signup' }) => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);

  const [error, setError] = useState<string | null>(null);
  const [formInput, setFormInput] = useState({ email: '', password: '' });
  const isUserRegistered = error === USER_ALREADY_REGISTERED;
  const showLogin = action === 'login' || isUserRegistered;

  const handleChangeFormInput = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    setFormInput((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleSubmit = useCallback(async (): Promise<void> => {
    const submitAction: Promise<AuthTokenResponse> = showLogin
      ? supabase.auth.signInWithPassword(formInput)
      : supabase.auth.signUp(formInput);
    const { data, error } = await submitAction;
    setError(error?.message);
    console.log({ data, error });
  }, [formInput, showLogin]);

  const handleEnter = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return user ? (
    <SignOut />
  ) : (
    <Form defaultValue={''} onSubmit={(e) => e.preventDefault()}>
      <FLPBox display="flex" flexDirection="column" gap={5} onKeyUp={handleEnter}>
        <FLPInput label={'Email:'} name="email" type="email" value={formInput.email} onChange={handleChangeFormInput} />
        <FLPInput
          label={'Password:'}
          name="password"
          error={error}
          type="password"
          value={formInput.password}
          onChange={handleChangeFormInput}
        />
        <FLPBox display="flex" flexDirection="column" justifyContent="center" alignItems="center" gap={4}>
          {isUserRegistered ? <FLPText>{t('clickAgainToLogIn')}</FLPText> : null}
          <FLPButton onClick={handleSubmit} type="submit">
            {t(showLogin ? 'logIn' : 'signUp')}
          </FLPButton>
        </FLPBox>
      </FLPBox>
    </Form>
  );
};

export default SignUp;
