import type { FC } from 'react';

import { useTranslation } from 'react-i18next';
import FLPButtonGroup from '~/components/core/buttons/FLPButtonGroup';
import FLPLinkButton from '~/components/core/buttons/FLPLinkButton';
import FLPBox from '~/components/core/structure/FLPBox';
import { useUserStore } from '~/store';

const NavMenu: FC = () => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);

  return (
    <FLPBox>
      <FLPButtonGroup gap={4}>
        <FLPLinkButton to="/">{t('home')}</FLPLinkButton>
        <FLPLinkButton to="/about">{t('about')}</FLPLinkButton>
        <FLPLinkButton to="/contact">{t('contact')}</FLPLinkButton>
        {!!user && (
          <FLPLinkButton variant="outline" to="/app">
            {t('launchApp')}
          </FLPLinkButton>
        )}
      </FLPButtonGroup>
    </FLPBox>
  );
};

export default NavMenu;
