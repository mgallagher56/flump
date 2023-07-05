import type { ReactElement } from 'react';

import { Container } from '@chakra-ui/react';
import SignUp from '~/components/users/SignUp';

const Index = (): ReactElement => {
  return (
    <Container maxW={'xs'} display="flex" justifyContent="center" alignItems="center">
      <SignUp action="signup" />
    </Container>
  );
};

export default Index;
