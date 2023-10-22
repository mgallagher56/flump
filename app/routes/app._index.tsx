import type { ReactElement } from 'react';

import { json } from '@remix-run/node';
import { redirect } from '@remix-run/server-runtime';
import FLPHeading from '~/components/core/typography/FLPHeading';
import { createSupaBaseServerClient } from '~/utils/supabase';

export const loader = async ({ request }: { request: Request }) => {
  const response = new Response();
  const supabase = createSupaBaseServerClient({ request, response });
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return redirect('/');
  return json({ ok: true });
};

const App = (): ReactElement => {
  return <FLPHeading>Dashboard</FLPHeading>;
};
export default App;
