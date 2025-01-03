import { type FC, type PropsWithChildren } from 'react';

import { Tabs, type TabsRootProps } from '@chakra-ui/react/tabs';

import type { TabData } from './types';

interface FLPTabsProps extends Omit<TabsRootProps, 'children'> {
  data: TabData[];
  orientation?: 'horizontal' | 'vertical';
}

const FLPTabs: FC<PropsWithChildren<FLPTabsProps>> = ({ data, orientation }) => {
  const FLPOrientation = orientation ?? 'horizontal';
  return (
    <Tabs.Root defaultValue={data[0].value} orientation={FLPOrientation}>
      <Tabs.List>
        {data.map((item) => (
          <Tabs.Trigger key={item.value} disabled={item.disabled} value={item.value}>
            {item.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {data.map((item) => (
        <Tabs.Content key={item.value} value={item.value}>
          {item.children}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
};

export default FLPTabs;
