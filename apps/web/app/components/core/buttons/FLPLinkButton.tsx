import { type FC, type PropsWithChildren } from 'react';

import type { ButtonProps } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';
import { Link } from 'react-router';

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
    <Button as={Link} colorScheme={colorScheme} disabled={disabled} to={to} variant={variant} {...rest}>
      {children}
    </Button>
  );
};

export default FLPLinkButton;
