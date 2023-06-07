import React from 'react';

import type { SpinnerProps } from '@chakra-ui/react';
import { Spinner } from '@chakra-ui/react';

const FLPSpinner: React.FC<SpinnerProps> = (props) => {
  return <Spinner {...props} />;
};

export default FLPSpinner;
