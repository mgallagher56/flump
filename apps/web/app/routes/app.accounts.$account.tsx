import type { ReactElement } from "react";

import { data, type Params, redirect } from "react-router";
import AccountDetailContainer from "~/containers/accounts/accountDetailContainer/AccountDetailContainer";
import { createSupaBaseServerClient } from "~/utils/supabase";

export const loader = async ({ params, request }: { params: Params; request: Request }) => {
  const responseHeaders = new Headers();
  const supabase = createSupaBaseServerClient(request, responseHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/", { headers: responseHeaders });

  const { data: accountData } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", params.account)
    .select();

  const { data: accountDetails } = await supabase
    .from("account_details")
    .select("*")
    .eq("account_id", params.account)
    .order("year", { ascending: false })
    .order("month", { ascending: true })
    .select();

  return data({ account: accountData?.[0], accountDetails, user }, { headers: responseHeaders });
};

const AccountDetailComponent = (): ReactElement<ReactElement> => {
  return <AccountDetailContainer />;
};

export default AccountDetailComponent;
