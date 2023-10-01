import type { ChangeEvent, FC, KeyboardEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { Form } from '@remix-run/react';
import type { User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import supabase from '~/utils/supabase';
import { AuthErrorEnums } from '~/utils/utils';

import FLPButton from '../core/buttons/FLPButton';
import FLPInput from '../core/inputs/input/FLPInput';
import FLPBox from '../core/structure/FLPBox';
import FLPText from '../core/typography/FLPText';
import { getSignUpButtonText, getSubmitUserAuthAction, SignUpActionEnum } from './utils';

const { USER_ALREADY_REGISTERED } = AuthErrorEnums;

interface SignUpProps {
  action?: SignUpActionEnum;
}

const SignUp: FC<SignUpProps> = ({ action = SignUpActionEnum.SIGNUP }) => {
  const { t } = useTranslation();

  const [userData, setUserData] = useState<User>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendMagicLink, setSendMagicLink] = useState<boolean>(false);
  const [isSubmitDisabled, setIsSubmitdisabled] = useState<boolean>(false);
  const [formInput, setFormInput] = useState({ email: '', password: '' });
  const isUserRegistered = error === USER_ALREADY_REGISTERED;
  const isShowLogin = action === SignUpActionEnum.LOGIN || isUserRegistered;

  const submitButtonText = getSignUpButtonText(t, isShowLogin, sendMagicLink);

  useEffect(() => {
    setIsSubmitdisabled(sendMagicLink ? !formInput.email : !formInput.email || !formInput.password);
  }, [sendMagicLink, formInput]);

  const handleChangeFormInput = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    setFormInput((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleSubmit = useCallback(async (): Promise<void> => {
    const submitAction = getSubmitUserAuthAction({
      supabaseClient: supabase,
      formInput,
      isShowLogin,
      isMagicLink: sendMagicLink
    });
    const { data, error } = await submitAction;
    setUserData(data?.user);
    setError(error?.message);
    console.log({ data, error });
  }, [sendMagicLink, formInput, isShowLogin]);

  const handleEnter = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return userData?.confirmation_sent_at ? (
    <FLPBox display="flex" flexDirection="column" gap={5}>
      <FLPText>{t('confirmEmailMsg')}</FLPText>
    </FLPBox>
  ) : (
    <Form defaultValue={''} onSubmit={(e) => e.preventDefault()}>
      <FLPBox display="flex" flexDirection="column" gap={5} onKeyUp={handleEnter}>
        <FLPInput
          label={'Email:'}
          name="email"
          type="email"
          value={formInput.email}
          error={sendMagicLink && error}
          onChange={handleChangeFormInput}
        />
        {!sendMagicLink && (
          <FLPInput
            label={'Password:'}
            name="password"
            error={error}
            type="password"
            value={formInput.password}
            onChange={handleChangeFormInput}
          />
        )}
        <FLPBox display="flex" flexDirection="column" justifyContent="center" alignItems="center" gap={4}>
          {isUserRegistered ? <FLPText>{t('clickAgainToLogIn')}</FLPText> : null}
          <FLPButton onClick={handleSubmit} type="submit" disabled={isSubmitDisabled}>
            {submitButtonText}
          </FLPButton>
          {isShowLogin && (
            <FLPButton variant="ghost" onClick={() => setSendMagicLink((prev) => !prev)}>
              {t(sendMagicLink ? 'loginWithPassword' : 'loginWithMagicLink')}
            </FLPButton>
          )}
        </FLPBox>
      </FLPBox>
    </Form>
  );
};

export default SignUp;
