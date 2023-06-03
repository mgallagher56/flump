import React from 'react';

import type { TabProps } from '@chakra-ui/react';
import { Tab } from '@chakra-ui/react';

export const FLPTab: React.FC<TabProps> = (props) => {
  return (
    <Tab onClick={props.onClick} {...props}>
      {props.children}
    </Tab>
  );
};
