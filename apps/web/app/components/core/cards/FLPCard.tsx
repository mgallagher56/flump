import type { FC } from 'react';

import type { CardRootProps } from '@chakra-ui/react';
import { CardRoot } from '@chakra-ui/react';

import { FLPCardStyles } from './FLPCardStyles';

const FLPCard: FC<CardRootProps> = (props) => {
  return (
    <CardRoot className={FLPCardStyles} {...props}>
      {props.children}
    </CardRoot>
  );
};
export default FLPCard;
