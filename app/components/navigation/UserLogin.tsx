import { useTranslation } from 'react-i18next';

import FLPButton from '../core/buttons/FLPButton';
import FLPButtonGroup from '../core/buttons/FLPButtonGroup';

const UserLogin = () => {
  const { t } = useTranslation();
  return (
    <FLPButtonGroup>
      <FLPButton>{t('signUp')}</FLPButton>
      <FLPButton>{t('logIn')}</FLPButton>
    </FLPButtonGroup>
  );
};

export default UserLogin;
