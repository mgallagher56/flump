import { type ReactElement } from 'react';

import { json } from '@remix-run/node';
import { type Params } from '@remix-run/react';
import { redirect } from '@remix-run/server-runtime';
import AccountDetailContainer from '~/containers/accounts/AccountDetailContainer';
import { createSupaBaseServerClient } from '~/utils/supabase';

export const loader = async ({ params, request }: { params: Params; request: Request }) => {
  const response = new Response();
  const supabase = createSupaBaseServerClient({ request, response });
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user?.id)
    .eq('id', params.account);

  if (!user) return redirect('/');
  return json({ account: data?.[0], user }, { headers: response.headers });
};

const AccountDetail = (): ReactElement => {
  return <AccountDetailContainer />;
};

export default AccountDetail;
