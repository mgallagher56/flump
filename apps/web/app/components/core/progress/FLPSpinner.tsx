import type { FC } from 'react';

import type { SpinnerProps } from '@chakra-ui/react';
import { Spinner } from '@chakra-ui/react';

const FLPSpinner: FC<SpinnerProps> = (props) => {
  return <Spinner {...props} />;
};

export default FLPSpinner;
