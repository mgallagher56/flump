import { type FC, type PropsWithChildren } from 'react';

import { Button, type ButtonProps } from '~/components/ui/button';

interface FLPButtonProps extends ButtonProps {
  padding?: number;
}

const FLPButton: FC<PropsWithChildren<FLPButtonProps>> = ({
  colorPalette = 'blue',
  disabled,
  loading,
  padding,
  variant = 'solid',
  onClick,
  ...buttonProps
}) => {
  return (
    <Button
      colorPalette={colorPalette}
      disabled={disabled}
      loading={loading}
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
