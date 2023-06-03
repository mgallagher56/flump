import React from 'react';

import type { TabListProps } from '@chakra-ui/react';
import { TabList } from '@chakra-ui/react';

export const FLPTabList: React.FC<TabListProps> = (props) => {
  return <TabList {...props}>{props.children}</TabList>;
};
