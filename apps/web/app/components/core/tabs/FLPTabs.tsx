import { type FC, type PropsWithChildren } from 'react';

import type { TabsProps } from '@chakra-ui/react';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';

import type { TabData } from './types';

interface FLPTabsProps extends Omit<TabsProps, 'children'> {
  data: TabData[];
  orientation?: 'horizontal' | 'vertical';
}

const FLPTabs: FC<PropsWithChildren<FLPTabsProps>> = ({ data, orientation }) => {
  const FLPOrientation = orientation ?? 'horizontal';
  return (
    <Tabs orientation={FLPOrientation}>
      <TabList>
        {data.map((item, index) => (
          <Tab value={item.value} tabIndex={index} key={item.value}>
            {item.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels>
        {data.map((item, index) => (
          <TabPanel tabIndex={index} key={item.value}>
            {item.children}
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
};

export default FLPTabs;
