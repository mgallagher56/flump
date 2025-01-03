import { type FC, type ReactElement } from 'react';

import { Flex } from '@chakra-ui/react';
import { useLoaderData } from 'react-router';
import FLPBox from '~/components/core/structure/FLPBox';
import HomeLogo from '~/components/navigation/HomeLogo';
import NavMenu from '~/components/navigation/NavMenu';
import UserLogin from '~/components/navigation/UserLogin';
import { ColorModeButton } from '~/components/ui/color-mode';
import type { loader } from '~/root';

import { loginStyles, menuStyles, navStyles } from './styles';

const Header: FC = (): ReactElement => {
  const { user } = useLoaderData<typeof loader>();
  return (
    <FLPBox as="header">
      <Flex as="nav" className={navStyles}>
        <FLPBox className={menuStyles}>
          <HomeLogo />
          <NavMenu
            routes={[
              { key: 'home', route: '/' }
              // { key: 'about', route: '/about' },
              // { key: 'contact', route: '/contact' }
            ]}
          />
          {!!user && (
            <NavMenu
              routes={[
                { key: 'dashboard', route: '/app' },
                { key: 'accounts', route: '/app/accounts' }
              ]}
            />
          )}
        </FLPBox>
        <FLPBox className={loginStyles}>
          <UserLogin />
          <ColorModeButton />
        </FLPBox>
      </Flex>
    </FLPBox>
  );
};

export default Header;
