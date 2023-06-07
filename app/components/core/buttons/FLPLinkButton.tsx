import React from 'react';

import type { ButtonProps } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';
import { Link } from '@remix-run/react';
import * as pressable from '@zag-js/pressable';
import type { PressEvent } from '@zag-js/pressable/dist/pressable.types';
import { normalizeProps, useMachine } from '@zag-js/react';

interface FLPLinkButtonProps extends ButtonProps {
  preventFocusOnPress?: boolean;
  to: string;
  onPress?: (e: PressEvent) => void;
  onLongPress?: (e: PressEvent) => void;
}

const FLPLinkButton: React.FC<React.PropsWithChildren<FLPLinkButtonProps>> = ({
  children,
  colorScheme = 'blue',
  isDisabled,
  preventFocusOnPress,
  to,
  variant = 'link',
  onPress,
  onLongPress
}) => {
  const [state, send] = useMachine(
    pressable.machine({
      id: 'pressableBaseButton',
      onPress,
      onLongPress,
      disabled: isDisabled,
      preventFocusOnPress: preventFocusOnPress ?? true
    })
  );

  const api = pressable.connect(state, send, normalizeProps);

  return (
    <Button colorScheme={colorScheme} as={Link} to={to} variant={variant} {...api.pressableProps}>
      {api.isPressed ? 'Pressed' : children}
    </Button>
  );
};

export default FLPLinkButton;
