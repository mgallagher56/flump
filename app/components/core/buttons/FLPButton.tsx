import type { FC, PropsWithChildren } from 'react';

import type { ButtonProps } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';
import * as pressable from '@zag-js/pressable';
import type { PressEvent } from '@zag-js/pressable/dist/pressable.types';
import { normalizeProps, useMachine } from '@zag-js/react';

interface FLPButtonProps extends ButtonProps {
  isLoading?: boolean;
  preventFocusOnPress?: boolean;
  padding?: number;
  onPress?: (e: PressEvent) => void;
}

const FLPButton: FC<PropsWithChildren<FLPButtonProps>> = ({
  colorScheme = 'blue',
  isDisabled,
  preventFocusOnPress,
  variant = 'solid',
  onPress,
  ...props
}) => {
  const [state, send] = useMachine(
    pressable.machine({
      id: 'pressableBaseButton',
      onPress,
      disabled: isDisabled,
      preventFocusOnPress
    })
  );

  const api = pressable.connect(state, send, normalizeProps);

  return (
    <Button {...api.pressableProps} {...props} variant={variant} colorScheme={colorScheme}>
      {props.children}
    </Button>
  );
};

export default FLPButton;
