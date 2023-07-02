import type { FC, PropsWithChildren } from 'react';

import type { ButtonGroupProps } from '@chakra-ui/react';
import { ButtonGroup } from '@chakra-ui/react';

const FLPButtonGroup: FC<PropsWithChildren<ButtonGroupProps>> = (props) => {
  return <ButtonGroup {...props}>{props.children}</ButtonGroup>;
};

export default FLPButtonGroup;
