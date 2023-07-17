import type { FC } from 'react';

import { useTranslation } from 'react-i18next';
import FLPButtonGroup from '~/components/core/buttons/FLPButtonGroup';
import FLPLinkButton from '~/components/core/buttons/FLPLinkButton';
import FLPBox from '~/components/core/structure/FLPBox';
import { useUserStore } from '~/store';

interface NavMenuProps {
  routes?: { key: string; route: string }[];
  showAppLink?: boolean;
}

const NavMenu: FC<NavMenuProps> = ({ routes, showAppLink = true }) => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const showApp = !!user && showAppLink;

  return (
    <FLPBox>
      <FLPButtonGroup gap={4}>
        {routes?.map((route) => (
          <FLPLinkButton key={route.key} to={route.route}>
            {t(route.key)}
          </FLPLinkButton>
        ))}
        {showApp && (
          <FLPLinkButton variant="outline" to="/app">
            {t('launchApp')}
          </FLPLinkButton>
        )}
      </FLPButtonGroup>
    </FLPBox>
  );
};

export default NavMenu;
