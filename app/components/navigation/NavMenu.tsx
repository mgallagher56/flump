import type { FC } from 'react';

import { useTranslation } from 'react-i18next';
import FLPButtonGroup from '~/components/core/buttons/FLPButtonGroup';
import FLPLinkButton from '~/components/core/buttons/FLPLinkButton';
import FLPBox from '~/components/core/structure/FLPBox';

interface NavMenuProps {
  routes?: { key: string; route: string }[];
}

const NavMenu: FC<NavMenuProps> = ({ routes }) => {
  const { t } = useTranslation();

  return (
    <FLPBox>
      <FLPButtonGroup gap={4}>
        {routes?.map((route) => (
          <FLPLinkButton key={route.key} to={route.route}>
            {t(route.key)}
          </FLPLinkButton>
        ))}
      </FLPButtonGroup>
    </FLPBox>
  );
};

export default NavMenu;
