import React from 'react';

import type { TabProps } from '@chakra-ui/react';
import { Button, useMultiStyleConfig } from '@chakra-ui/react';

import FLPBox from '../structure/FLPBox';

const FLPTab: React.FC<TabProps> = (props) => {
  const isSelected = !!props['aria-selected'];

  const styles = useMultiStyleConfig('Tabs', { props });

  return (
    <Button __css={styles.tab} {...props} width="max-content">
      <FLPBox as="span" mr="2">
        {isSelected ? '😎' : '😐'}
      </FLPBox>
      {props.children}
    </Button>
  );
};
export default FLPTab;
