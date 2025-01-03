import { type User } from '@supabase/supabase-js';
import { type ReactElement } from 'react';

import { data, redirect, type RedirectFunction, type UNSAFE_DataWithResponseInit } from 'react-router';
import AccountsContainer from '~/containers/accounts/accountsContainer/AccountsContainer';
import { type Account, type AccountDetail } from '~/containers/accounts/types';
import { createSupaBaseServerClient } from '~/utils/supabase';

export const loader = async ({
  request
}: {
  request: Request;
}): Promise<
  | ReturnType<RedirectFunction>
  | UNSAFE_DataWithResponseInit<{
      accounts: Account[];
      accountDetails: AccountDetail[];
      user: User;
    }>
> => {
  const response = new Response();
  const supabase = createSupaBaseServerClient({ request, response });
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: accounts } = await supabase.from('accounts').select().eq('user_id', user?.id);

  const { data: accountDetails } = await supabase.from('account_details').select();

  if (!user) return redirect('/');
  return data({ accounts, accountDetails, user }, { headers: response.headers });
};

const Accounts = (): ReactElement => {
  return <AccountsContainer />;
};
export default Accounts;
