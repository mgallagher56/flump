import type { PropsWithChildren } from 'react';
import React from 'react';

import type { HeadingProps } from '@chakra-ui/react';
import { Heading } from '@chakra-ui/react';

const FLPHeading: React.FC<PropsWithChildren<HeadingProps>> = (props) => {
  return <Heading {...props}>{props.children}</Heading>;
};

export default FLPHeading;
