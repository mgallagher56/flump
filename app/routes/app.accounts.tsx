import type { ReactElement } from 'react';

import { json } from '@remix-run/node';
import { redirect } from '@remix-run/server-runtime';
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

const Accounts = (): ReactElement => {
  return <div>Accounts</div>;
};
export default Accounts;
