import type { ChangeEvent } from 'react';
import { useCallback, useState } from 'react';

import { Form } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import supabase from '~/utils/supabase';

import FLPButton from '../core/buttons/FLPButton';
import FLPInput from '../core/input/FLPInput';
import FLPBox from '../core/structure/FLPBox';

const SignUp = () => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [formInput, setFormInput] = useState({ email: '', password: '' });

  const handleChangeFormInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFormInput((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleEmailSignUp = useCallback(
    async (e) => {
      // e.preventDefault();
      const { data, error } = await supabase.auth.signUp(formInput);
      setError(error?.message);
      console.log({ data, error });
    },
    [formInput]
  );

  const handleEnter = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        handleEmailSignUp(e);
      }
    },
    [handleEmailSignUp]
  );

  return (
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
        <FLPButton onClick={handleEmailSignUp} type="submit">
          {t('signUp')}
        </FLPButton>
      </FLPBox>
    </Form>
  );
};

export default SignUp;
