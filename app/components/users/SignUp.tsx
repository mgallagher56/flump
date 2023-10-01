import type { ChangeEvent, FC } from 'react';
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
import { getInfoMessage, getSignUpButtonText, getSubmitUserAuthAction, SignUpActionEnum } from './utils';

const { USER_ALREADY_REGISTERED } = AuthErrorEnums;

interface SignUpProps {
  action?: SignUpActionEnum;
}

const SignUp: FC<SignUpProps> = ({ action = SignUpActionEnum.SIGNUP }) => {
  const { t } = useTranslation();

  const [userData, setUserData] = useState<User>(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sendMagicLink, setSendMagicLink] = useState<boolean>(false);
  const [isSubmitDisabled, setIsSubmitdisabled] = useState<boolean>(false);
  const [formInput, setFormInput] = useState({ email: '', password: '' });
  const [isUserRegistered, setIsUserRegistered] = useState<boolean>(false);
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
    setIsUserRegistered(error?.message === USER_ALREADY_REGISTERED);
    setInfoMessage(getInfoMessage(t, error?.message === USER_ALREADY_REGISTERED, sendMagicLink));
    console.log({ data, error });
  }, [formInput, isShowLogin, sendMagicLink, t]);

  return userData?.confirmation_sent_at ? (
    <FLPBox display="flex" flexDirection="column" gap={5}>
      <FLPText>{t('confirmEmailMsg')}</FLPText>
    </FLPBox>
  ) : (
    <Form defaultValue={''} onSubmit={handleSubmit}>
      <FLPBox display="flex" flexDirection="column" gap={5}>
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
          {infoMessage}
          <FLPButton onClick={handleSubmit} type="submit" disabled={isSubmitDisabled}>
            {submitButtonText}
          </FLPButton>
          {isShowLogin && (
            <FLPButton
              variant="ghost"
              onClick={() => {
                setError('');
                setInfoMessage('');
                setSendMagicLink((prev) => !prev);
              }}
            >
              {t(sendMagicLink ? 'loginWithPassword' : 'loginWithMagicLink')}
            </FLPButton>
          )}
        </FLPBox>
      </FLPBox>
    </Form>
  );
};

export default SignUp;
