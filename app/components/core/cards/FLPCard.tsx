import type { FC } from 'react';

import type { CardProps } from '@chakra-ui/react';
import { Card } from '@chakra-ui/react';

const FLPCard: FC<CardProps> = (props) => {
  return <Card {...props}>{props.children}</Card>;
};
export default FLPCard;
