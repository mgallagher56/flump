import React from 'react';

import type { TextProps } from '@chakra-ui/react';
import { Text } from '@chakra-ui/react';

const FLPText: React.FC<TextProps> = ({
  fontSize = 'md',
  fontWeight = 'normal',
  lineHeight = 'base',
  letterSpacing = 'normal',
  ...props
}) => {
  return (
    <Text fontSize={fontSize} fontWeight={fontWeight} lineHeight={lineHeight} letterSpacing={letterSpacing} {...props}>
      {props.children}
    </Text>
  );
};

export default FLPText;
