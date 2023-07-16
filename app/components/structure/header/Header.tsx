import type { FC, ReactElement } from 'react';

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
  return (
    <FLPBox as="header">
      <Flex as="nav" className={navStyles}>
        <FLPBox className={menuStyles}>
          <HomeLogo />
          <NavMenu />
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
