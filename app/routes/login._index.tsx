import type { ReactElement } from 'react';

import { Container } from '@chakra-ui/react';
import { json } from '@remix-run/node';
import { redirect } from '@remix-run/server-runtime';
import SignUp from '~/components/users/SignUp';
import { createSupaBaseServerClient } from '~/utils/supabase';
import { SignUpActionEnum } from '~/components/users/utils';

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
      <SignUp action={SignUpActionEnum.LOGIN} />
    </Container>
  );
};

export default Index;
