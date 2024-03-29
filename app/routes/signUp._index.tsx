import type { ReactElement } from 'react';

import { Container } from '@chakra-ui/react';
import { json, redirect } from '@remix-run/node';
import SignUp from '~/components/users/SignUp';
import { createSupaBaseServerClient } from '~/utils/supabase';

export const loader = async ({ request }: { request: Request }) => {
  const response = new Response();
  const supabase = createSupaBaseServerClient({ request, response });
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) return redirect('/');
  return json({ ok: true });
};

const Index = (): ReactElement => {
  return (
    <Container maxW={'xs'} display="flex" justifyContent="center" alignItems="center">
      <SignUp />
    </Container>
  );
};

export default Index;
