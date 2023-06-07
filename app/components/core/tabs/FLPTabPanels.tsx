import React from 'react';

import type { TabPanelsProps } from '@chakra-ui/react';
import { TabPanels } from '@chakra-ui/react';

const FLPTabPanels: React.FC<TabPanelsProps> = (props) => {
  return <TabPanels {...props}>{props.children}</TabPanels>;
};

export default FLPTabPanels;
