import { type ReactElement } from 'react';

import { json } from '@remix-run/node';
import { redirect } from '@remix-run/server-runtime';
import AccountsContainer from '~/containers/accounts/accountsContainer/AccountsContainer';
import { createSupaBaseServerClient } from '~/utils/supabase';

export const loader = async ({ request }: { request: Request }) => {
  const response = new Response();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const supabase = createSupaBaseServerClient({ request, response });
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user?.id);

  const { data: accountBalances } = await supabase
    .from('account_details')
    .select('account_id, value')
    .eq('year', currentYear)
    .eq('month', currentMonth);

  if (!user) return redirect('/');
  return json({ accounts: data, accountBalances, user }, { headers: response.headers });
};

const Accounts = (): ReactElement => {
  return <AccountsContainer />;
};
export default Accounts;
