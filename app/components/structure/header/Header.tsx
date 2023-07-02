import type { FC, ReactElement } from 'react';

import { Flex } from '@chakra-ui/react';
import FLPBox from '~/components/core/structure/FLPBox';
import NavMenu from '~/components/navigation/NavMenu';
import UserLogin from '~/components/navigation/UserLogin';

import HomeLogo from '../../navigation/HomeLogo';
import { navStyles } from './styles';

const Header: FC = (): ReactElement => {
  return (
    <FLPBox as="header">
      <Flex as="nav" css={navStyles}>
        <HomeLogo />
        <NavMenu />
        <UserLogin />
      </Flex>
    </FLPBox>
  );
};

export default Header;
