import type { ReactElement } from 'react';

import { Container } from '@chakra-ui/react';
import { redirect, type RedirectFunction } from 'react-router';
import SignUp from '~/components/users/SignUp';
import { SignUpActionEnum } from '~/components/users/utils';
import { createSupaBaseServerClient } from '~/utils/supabase';

export const loader = async ({
  request
}: {
  request: Request;
}): Promise<ReturnType<RedirectFunction> | { ok: true }> => {
  const supabase = createSupaBaseServerClient(request);
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) return redirect('/');
  return { ok: true };
};

const Index = (): ReactElement => {
  return (
    <Container alignItems="center" display="flex" justifyContent="center" maxW={'xs'}>
      <SignUp action={SignUpActionEnum.LOGIN} />
    </Container>
  );
};

export default Index;
