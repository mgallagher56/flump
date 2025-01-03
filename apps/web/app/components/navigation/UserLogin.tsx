import type { FC } from 'react';

import { useTranslation } from 'react-i18next';
import { useLoaderData } from 'react-router';
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
          <FLPLinkButton text={t('signUp')} to="/signup" />
          <FLPLinkButton text={t('logIn')} to="/login" />
        </>
      )}
    </FLPButtonGroup>
  );
};

export default UserLogin;
