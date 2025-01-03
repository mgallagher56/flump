import { type User } from '@supabase/supabase-js';
import { type ReactElement } from 'react';

import { data, type Params, redirect, type RedirectFunction, type UNSAFE_DataWithResponseInit } from 'react-router';
import AccountDetailContainer from '~/containers/accounts/accountDetailContainer/AccountDetailContainer';
import { type Account, type AccountDetail } from '~/containers/accounts/types';
import { createSupaBaseServerClient } from '~/utils/supabase';

export const loader = async ({
  params,
  request
}: {
  params: Params;
  request: Request;
}): Promise<
  ReturnType<RedirectFunction> | UNSAFE_DataWithResponseInit<{ account: Account; accountDetails: AccountDetail[]; user: User }>
> => {
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
  return data({ account: accountData?.[0], accountDetails, user }, { headers: response.headers });
};

const AccountDetailComponent = (): ReactElement => {
  return <AccountDetailContainer />;
};

export default AccountDetailComponent;
