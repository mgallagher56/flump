import type { ReactElement } from 'react';

import { Container } from '@chakra-ui/react';
import SignUp from '~/components/Users/SignUp';

const Index = (): ReactElement => {
  return (
    <Container maxW={'xs'}>
      <SignUp />
    </Container>
  );
};

export default Index;
