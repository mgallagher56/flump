import type { FC, PropsWithChildren } from 'react';

import type { HeadingProps } from '@chakra-ui/react';
import { Heading } from '@chakra-ui/react';

const FLPHeading: FC<PropsWithChildren<HeadingProps>> = ({ color = 'blue.500', ...props }) => {
  return (
    <Heading color={color} {...props}>
      {props.children}
    </Heading>
  );
};

export default FLPHeading;
