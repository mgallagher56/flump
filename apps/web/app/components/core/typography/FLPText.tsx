import type { FC } from 'react';

import type { TextProps } from '@chakra-ui/react';
import { Text } from '@chakra-ui/react';

const FLPText: FC<TextProps> = ({
  fontSize = 'md',
  fontWeight = 'normal',
  lineHeight = 'base',
  letterSpacing = 'normal',
  ...props
}) => {
  return (
    <Text fontSize={fontSize} fontWeight={fontWeight} letterSpacing={letterSpacing} lineHeight={lineHeight} {...props}>
      {props.children}
    </Text>
  );
};

export default FLPText;
