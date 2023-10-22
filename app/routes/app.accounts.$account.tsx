import { type ReactElement } from 'react';

import { json } from '@remix-run/node';
import { type Params } from '@remix-run/react';
import { redirect } from '@remix-run/server-runtime';
import AccountDetailContainer from '~/containers/accounts/accountDetailContainer/AccountDetailContainer';
import { createSupaBaseServerClient } from '~/utils/supabase';

export const loader = async ({ params, request }: { params: Params; request: Request }) => {
  const response = new Response();
  const supabase = createSupaBaseServerClient({ request, response });
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: accountData } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user?.id)
    .eq('id', params.account);

  const { data: accountDetails } = await supabase
    .from('account_details')
    .select('*')
    .eq('account_id', params.account)
    .order('year', { ascending: false })
    .order('month', { ascending: true });

  if (!user) return redirect('/');
  return json({ account: accountData?.[0], accountDetails, user }, { headers: response.headers });
};

const AccountDetail = (): ReactElement => {
  return <AccountDetailContainer />;
};

export default AccountDetail;
