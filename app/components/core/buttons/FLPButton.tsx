import React from 'react';

import type { ButtonProps } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';
import * as pressable from '@zag-js/pressable';
import type { PressEvent } from '@zag-js/pressable/dist/pressable.types';
import { normalizeProps, useMachine } from '@zag-js/react';

interface FLPButtonProps extends ButtonProps {
  preventFocusOnPress?: boolean;
  onPress?: (e: PressEvent) => void;
  onLongPress?: (e: PressEvent) => void;
}

const FLPButton: React.FC<React.PropsWithChildren<FLPButtonProps>> = ({
  children,
  colorScheme = 'blue',
  isDisabled,
  preventFocusOnPress,
  variant = 'solid',
  onLongPress,
  onPress,
  isLoading
}) => {
  const [state, send] = useMachine(
    pressable.machine({
      id: 'pressableBaseButton',
      onPress,
      onLongPress,
      disabled: isDisabled,
      preventFocusOnPress
    })
  );

  const api = pressable.connect(state, send, normalizeProps);

  return (
    <Button {...api.pressableProps} variant={variant} colorScheme={colorScheme} isLoading={isLoading}>
      {children}
    </Button>
  );
};

export default FLPButton;
