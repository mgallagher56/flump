import type { FC } from 'react';

import type { CardProps } from '@chakra-ui/react';
import { Card } from '@chakra-ui/react';

import { FLPCardStyles } from './FLPCardStyles';

const FLPCard: FC<CardProps> = (props) => {
  return (
    <Card className={FLPCardStyles} {...props}>
      {props.children}
    </Card>
  );
};
export default FLPCard;
