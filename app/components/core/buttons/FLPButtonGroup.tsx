import React from 'react';

import type { ButtonGroupProps } from '@chakra-ui/react';
import { ButtonGroup } from '@chakra-ui/react';

export const FLPButtonGroup: React.FC<ButtonGroupProps> = (props) => {
  return <ButtonGroup {...props}>{props.children}</ButtonGroup>;
};
