import React from 'react';

import type { ButtonProps } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';

export const FLPButton: React.FC<ButtonProps> = (props) => {
  return (
    <Button colorScheme={props.colorScheme} onClick={props.onClick} {...props}>
      {props.children}
    </Button>
  );
};
