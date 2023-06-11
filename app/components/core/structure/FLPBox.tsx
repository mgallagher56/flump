import React from 'react';

import type { BoxProps } from '@chakra-ui/react';
import { Box } from '@chakra-ui/react';

const FLPBox: React.FC<React.PropsWithChildren<BoxProps>> = (props) => {
  return <Box {...props}>{props.children}</Box>;
};

export default FLPBox;
