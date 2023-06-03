import React from 'react';

import type { ButtonProps } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';
import { Link } from '@remix-run/react';

interface FLPLinkButtonProps extends ButtonProps {
  to: string;
}

export const FLPLinkButton: React.FC<FLPLinkButtonProps> = (props) => {
  return (
    <Button colorScheme={props.colorScheme} as={Link} to={props.to} onClick={props.onClick} {...props}>
      {props.children}
    </Button>
  );
};
