import type { ReactElement } from 'react';

import { Container } from '@chakra-ui/react';
import { redirect, type RedirectFunction } from 'react-router';
import SignUp from '~/components/users/SignUp';
import { createSupaBaseServerClient } from '~/utils/supabase';

import type { Route } from './+types/signUp._index';

export const loader = async ({
  request
}: Route.LoaderArgs): Promise<ReturnType<RedirectFunction> | { ok: boolean }> => {
  const response = new Response();
  const supabase = createSupaBaseServerClient({ request, response });
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) return redirect('/');
  return { ok: true };
};

const Index = (): ReactElement => {
  return (
    <Container alignItems="center" display="flex" justifyContent="center" maxW={'xs'}>
      <SignUp />
    </Container>
  );
};

export default Index;
