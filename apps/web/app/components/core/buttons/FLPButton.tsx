import { type FC, type PropsWithChildren } from 'react';

import type { ButtonProps } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';

interface FLPButtonProps extends ButtonProps {
  padding?: number;
}

const FLPButton: FC<PropsWithChildren<FLPButtonProps>> = ({
  colorScheme = 'blue',
  disabled,
  isLoading,
  padding,
  variant = 'solid',
  onClick,
  ...buttonProps
}) => {
  return (
    <Button
      colorScheme={colorScheme}
      isDisabled={disabled}
      isLoading={isLoading}
      padding={padding}
      variant={variant}
      width={'max-content'}
      onClick={onClick}
      {...buttonProps}
    >
      {buttonProps.children}
    </Button>
  );
};

export default FLPButton;
