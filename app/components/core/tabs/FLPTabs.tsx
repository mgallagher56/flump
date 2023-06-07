import type { PropsWithChildren } from 'react';
import React from 'react';

import { Tabs } from '@chakra-ui/react';

interface FLPTabsProps extends React.HTMLAttributes<HTMLElement> {
  orientation?: 'horizontal' | 'vertical';
  onChange?: any;
}

const FLPTabs: React.FC<PropsWithChildren<FLPTabsProps>> = (props) => {
  return <Tabs {...props}>{props.children}</Tabs>;
};

export default FLPTabs;
