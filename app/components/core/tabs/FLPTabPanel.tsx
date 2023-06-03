import React from 'react';

import type { TabPanelProps } from '@chakra-ui/react';
import { TabPanel } from '@chakra-ui/react';

export const FLPTabPanel: React.FC<TabPanelProps> = (props) => {
  return <TabPanel {...props}>{props.children}</TabPanel>;
};
