import React from 'react';

import { Box, Button, useMultiStyleConfig } from '@chakra-ui/react';

const FLPTab: React.FC<any> = (props) => {
  const isSelected = !!props['aria-selected'];

  const styles = useMultiStyleConfig('Tabs', { props });

  return (
    <Button __css={styles.tab} {...props} width="max-content">
      <Box as="span" mr="2">
        {isSelected ? '😎' : '😐'}
      </Box>
      {props.children}
    </Button>
  );
};
export default FLPTab;
