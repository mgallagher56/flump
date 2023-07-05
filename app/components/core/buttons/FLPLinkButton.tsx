import { type FC, type PropsWithChildren, useId } from 'react';

import type { ButtonProps } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';
import { Link } from '@remix-run/react';
import * as pressable from '@zag-js/pressable';
import { normalizeProps, useMachine } from '@zag-js/react';

interface FLPLinkButtonProps extends ButtonProps {
  preventFocusOnPress?: boolean;
  to: string;
}

const FLPLinkButton: FC<PropsWithChildren<FLPLinkButtonProps>> = ({
  children,
  colorScheme = 'blue',
  isDisabled,
  preventFocusOnPress,
  variant = 'link',
  to
}) => {
  const [state, send] = useMachine(
    pressable.machine({
      id: useId(),
      disabled: isDisabled,
      preventFocusOnPress: preventFocusOnPress ?? true
    })
  );

  const api = pressable.connect(state, send, normalizeProps);

  return (
    <Button colorScheme={colorScheme} as={Link} to={to} variant={variant} {...api.pressableProps}>
      {children}
    </Button>
  );
};

export default FLPLinkButton;
