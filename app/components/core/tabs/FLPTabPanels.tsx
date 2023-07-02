import type { FC } from 'react';

import type { TabPanelsProps } from '@chakra-ui/react';
import { TabPanels } from '@chakra-ui/react';

const FLPTabPanels: FC<TabPanelsProps> = (props) => {
  return <TabPanels {...props}>{props.children}</TabPanels>;
};

export default FLPTabPanels;
