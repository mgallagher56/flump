import type { FC, ReactElement } from 'react';

import { Flex } from '@chakra-ui/react';
import ColorModeSwitch from '~/components/ColorModeSwitch';
import FLPBox from '~/components/core/structure/FLPBox';
import NavMenu from '~/components/navigation/NavMenu';
import UserLogin from '~/components/navigation/UserLogin';

import HomeLogo from '../../navigation/HomeLogo';
import { loginStyles, menuStyles, navStyles } from './styles';

const Header: FC = (): ReactElement => {
  return (
    <FLPBox as="header">
      <Flex as="nav" css={navStyles}>
        <FLPBox css={menuStyles}>
          <HomeLogo />
          <NavMenu />
        </FLPBox>
        <FLPBox css={loginStyles}>
          <UserLogin />
          <ColorModeSwitch />
        </FLPBox>
      </Flex>
    </FLPBox>
  );
};

export default Header;
