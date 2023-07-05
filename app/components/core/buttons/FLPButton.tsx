import { type FC, type PropsWithChildren, useId } from 'react';

import type { ButtonProps } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';
import * as pressable from '@zag-js/pressable';
import { mergeProps, normalizeProps, useMachine } from '@zag-js/react';

interface FLPButtonProps extends ButtonProps {
  isLoading?: boolean;
  preventFocusOnPress?: boolean;
  padding?: number;
}

const FLPButton: FC<PropsWithChildren<FLPButtonProps>> = ({
  colorScheme = 'blue',
  isDisabled,
  preventFocusOnPress,
  variant = 'solid',
  onClick,
  ...props
}) => {
  const [state, send] = useMachine(
    pressable.machine({
      id: useId(),
      disabled: isDisabled,
      preventFocusOnPress
    })
  );

  const api = pressable.connect(state, send, normalizeProps);
  const buttonProps: ButtonProps = mergeProps(
    { ...api.pressableProps },
    { ...props, isDisabled, onClick, variant, colorScheme }
  );

  return <Button {...buttonProps}>{props.children}</Button>;
};

export default FLPButton;
