import type { FC, PropsWithChildren } from 'react';

import { Tabs } from '@chakra-ui/react';

interface FLPTabsProps {
  orientation?: 'horizontal' | 'vertical';
}

const FLPTabs: FC<PropsWithChildren<FLPTabsProps>> = (props) => {
  return <Tabs {...props}>{props.children}</Tabs>;
};

export default FLPTabs;
