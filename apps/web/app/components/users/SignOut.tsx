import type { FC } from 'react';

import { useTranslation } from 'react-i18next';
import FLPButton from '~/components/core/buttons/FLPButton';
import supabase from '~/utils/supabase';

const SignOut: FC = () => {
  const { t } = useTranslation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return <FLPButton onClick={handleLogout}>{t('logOut')}</FLPButton>;
};

export default SignOut;
