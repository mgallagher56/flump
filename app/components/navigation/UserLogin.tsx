import type { FC } from 'react';

import { useTranslation } from 'react-i18next';
import { useUserStore } from '~/store';

import FLPButtonGroup from '../core/buttons/FLPButtonGroup';
import FLPLinkButton from '../core/buttons/FLPLinkButton';
import SignOut from '../users/SignOut';

const UserLogin: FC = () => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);

  return (
    <FLPButtonGroup>
      {user ? (
        <SignOut />
      ) : (
        <>
          <FLPLinkButton to="/signup" variant="solid">
            {t('signUp')}
          </FLPLinkButton>
          <FLPLinkButton to="/login" variant="outline">
            {t('logIn')}
          </FLPLinkButton>
        </>
      )}
    </FLPButtonGroup>
  );
};

export default UserLogin;
