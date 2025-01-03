import type { ChangeEvent, FC } from 'react';
import { useCallback, useEffect, useState } from 'react';

import type { User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { Form } from 'react-router';
import FLPButton from '~/components/core/buttons/FLPButton';
import FLPInput from '~/components/core/inputs/input/FLPInput';
import FLPBox from '~/components/core/structure/FLPBox';
import FLPText from '~/components/core/typography/FLPText';
import supabase from '~/utils/supabase';
import { AuthErrorEnums } from '~/utils/utils';

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

  const handleSubmit = useCallback(
    async (e: { preventDefault: () => void }): Promise<void> => {
      e.preventDefault();
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
    },
    [formInput, isShowLogin, sendMagicLink, t]
  );

  return userData?.confirmation_sent_at ? (
    <FLPBox display="flex" flexDirection="column" gap={5}>
      <FLPText>{t('confirmEmailMsg')}</FLPText>
    </FLPBox>
  ) : (
    <Form action="" defaultValue={''} method="GET" onSubmit={handleSubmit}>
      <FLPBox display="flex" flexDirection="column" gap={5}>
        <FLPInput
          error={sendMagicLink && error}
          label={'Email:'}
          name="email"
          type="email"
          value={formInput.email}
          onChange={handleChangeFormInput}
        />
        {!sendMagicLink && (
          <FLPInput
            error={error}
            label={'Password:'}
            name="password"
            type="password"
            value={formInput.password}
            onChange={handleChangeFormInput}
          />
        )}
        <FLPBox alignItems="center" display="flex" flexDirection="column" gap={4} justifyContent="center">
          {infoMessage}
          <FLPButton disabled={isSubmitDisabled} type="submit" onClick={handleSubmit}>
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
