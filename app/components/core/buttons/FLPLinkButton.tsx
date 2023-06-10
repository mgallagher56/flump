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
}

const FLPLinkButton: React.FC<React.PropsWithChildren<FLPLinkButtonProps>> = ({
  children,
  colorScheme = 'blue',
  isDisabled,
  preventFocusOnPress,
  to
}) => {
  const [state, send] = useMachine(
    pressable.machine({
      id: 'pressableBaseButton',
      disabled: isDisabled,
      preventFocusOnPress: preventFocusOnPress ?? true
    })
  );

  const api = pressable.connect(state, send, normalizeProps);

  return (
    <Button colorScheme={colorScheme} as={Link} to={to} variant="link" {...api.pressableProps}>
      {children}
    </Button>
  );
};

export default FLPLinkButton;
