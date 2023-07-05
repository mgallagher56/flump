import { useTranslation } from 'react-i18next';

import FLPButtonGroup from '../core/buttons/FLPButtonGroup';
import FLPLinkButton from '../core/buttons/FLPLinkButton';

const UserLogin = () => {
  const { t } = useTranslation();
  return (
    <FLPButtonGroup>
      <FLPLinkButton to="/signUp" variant="solid">
        {t('signUp')}
      </FLPLinkButton>
      <FLPLinkButton to="/login" variant="outline">
        {t('logIn')}
      </FLPLinkButton>
    </FLPButtonGroup>
  );
};

export default UserLogin;
