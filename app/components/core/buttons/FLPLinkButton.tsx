import { type FC, type PropsWithChildren } from 'react';

import type { ButtonProps } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';
import { Link } from '@remix-run/react';

interface FLPLinkButtonProps extends ButtonProps {
  to: string;
}

const FLPLinkButton: FC<PropsWithChildren<FLPLinkButtonProps>> = ({
  children,
  colorScheme = 'blue',
  disabled,
  variant = 'link',
  to,
  ...rest
}) => {
  return (
    <Button colorScheme={colorScheme} as={Link} to={to} variant={variant} disabled={disabled} {...rest}>
      {children}
    </Button>
  );
};

export default FLPLinkButton;
