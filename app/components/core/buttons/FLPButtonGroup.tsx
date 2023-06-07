import React from 'react';

import type { ButtonGroupProps } from '@chakra-ui/react';
import { ButtonGroup } from '@chakra-ui/react';

const FLPButtonGroup: React.FC<React.PropsWithChildren<ButtonGroupProps>> = (props) => {
  return <ButtonGroup {...props}>{props.children}</ButtonGroup>;
};

export default FLPButtonGroup;
