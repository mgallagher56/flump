import type { FC, PropsWithChildren } from 'react';
import { useId } from 'react';

import { normalizeProps, useMachine } from '@zag-js/react';
import * as tabs from '@zag-js/tabs';

import FLPTab from '../components/core/tabs/FLPTab';
import FLPTabList from '../components/core/tabs/FLPTabList';
import FLPTabPanel from '../components/core/tabs/FLPTabPanel';
import FLPTabPanels from '../components/core/tabs/FLPTabPanels';
import FLPTabsWrapper from '../components/core/tabs/FLPTabs';
import type { TabData } from '../components/core/tabs/types';

interface TabsContainerProps {
  data: TabData[];
  orientation?: 'horizontal' | 'vertical';
}

const TabsContainer: FC<PropsWithChildren<TabsContainerProps>> = ({ data, orientation }) => {
  const FLPOrientation = orientation ?? 'horizontal';
  const [state, send] = useMachine(tabs.machine({ id: useId(), value: data[0].value, orientation: FLPOrientation }));

  const api = tabs.connect(state, send, normalizeProps);

  return (
    <FLPTabsWrapper {...api.rootProps} orientation={FLPOrientation}>
      <FLPTabList {...api.tablistProps}>
        {data.map((item, index) => (
          <FLPTab {...api.getTriggerProps({ value: item.value })} tabIndex={index} key={item.value}>
            {item.label}
          </FLPTab>
        ))}
        <div {...api.indicatorProps} />
      </FLPTabList>
      <FLPTabPanels>
        {data.map((item, index) => (
          <FLPTabPanel {...api.getContentProps({ value: item.value })} tabIndex={index} key={item.value}>
            {item.content}
          </FLPTabPanel>
        ))}
      </FLPTabPanels>
    </FLPTabsWrapper>
  );
};

export default TabsContainer;
