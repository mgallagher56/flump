import type { FC } from 'react';

import { useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import FLPButtonGroup from '~/components/core/buttons/FLPButtonGroup';
import FLPLinkButton from '~/components/core/buttons/FLPLinkButton';
import SignOut from '~/components/users/SignOut';
import type { loader } from '~/root';

const UserLogin: FC = () => {
  const { t } = useTranslation();

  const { user } = useLoaderData<typeof loader>();

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