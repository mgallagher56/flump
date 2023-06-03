import React from 'react';

import type { TabsProps } from '@chakra-ui/react';
import { Tabs } from '@chakra-ui/react';

export const FLPTabs: React.FC<TabsProps> = (props) => {
  return (
    <Tabs {...props}>
      {props.children}
    </Tabs>
  );
};
