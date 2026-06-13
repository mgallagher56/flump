import type { ReactElement } from "react";

import { data, redirect } from "react-router";
import AccountsContainer from "~/containers/accounts/accountsContainer/AccountsContainer";
import { createSupaBaseServerClient } from "~/utils/supabase";

export const loader = async ({ request }: { request: Request }) => {
  const responseHeaders = new Headers();
  const supabase = createSupaBaseServerClient(request, responseHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/", { headers: responseHeaders });

  const { data: accounts } = await supabase
    .from("accounts")
    .select()
    .eq("user_id", user.id)
    .select();

  const { data: accountDetails } = await supabase.from("account_details").select();

  return data({ accounts, accountDetails, user }, { headers: responseHeaders });
};

const Accounts = (): ReactElement<ReactElement> => {
  return <AccountsContainer />;
};
export default Accounts;
