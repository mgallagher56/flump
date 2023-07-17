import { type FC, type ReactElement, useEffect, useState } from 'react';

import { Flex } from '@chakra-ui/react';
import ColorModeSwitch from '~/components/ColorModeSwitch';
import FLPBox from '~/components/core/structure/FLPBox';
import NavMenu from '~/components/navigation/NavMenu';
import UserLogin from '~/components/navigation/UserLogin';

import HomeLogo from '../../navigation/HomeLogo';
import { loginStyles, menuStyles, navStyles } from './styles';

interface HeaderProps {
  showColorModeSwitch?: boolean;
}

const Header: FC<HeaderProps> = ({ showColorModeSwitch = true }): ReactElement => {
  const [isApp, setIsApp] = useState(false);
  useEffect(() => {
    setIsApp(!!window.location.pathname.includes('/app'));
  }, []);

  return (
    <FLPBox as="header">
      <Flex as="nav" className={navStyles}>
        <FLPBox className={menuStyles}>
          <HomeLogo />
          {isApp ? (
            <NavMenu
              routes={[
                { key: 'dashboard', route: '/app' },
                { key: 'accounts', route: '/app/accounts' }
              ]}
              showAppLink={false}
            />
          ) : (
            <NavMenu
              routes={[
                { key: 'home', route: '/' },
                { key: 'about', route: '/about' },
                { key: 'contact', route: '/contact' }
              ]}
            />
          )}
        </FLPBox>
        <FLPBox className={loginStyles}>
          <UserLogin />
          {showColorModeSwitch && <ColorModeSwitch />}
        </FLPBox>
      </Flex>
    </FLPBox>
  );
};

export default Header;
