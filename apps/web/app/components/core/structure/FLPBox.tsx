import type { FC, PropsWithChildren } from 'react';

import type { BoxProps } from '@chakra-ui/react';
import { Box } from '@chakra-ui/react';

const FLPBox: FC<PropsWithChildren<BoxProps>> = (props) => {
  return <Box {...props}>{props.children}</Box>;
};

export default FLPBox;
