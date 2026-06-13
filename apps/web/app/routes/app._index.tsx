import type { ReactElement } from "react";

import { data, redirect } from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import { createSupaBaseServerClient } from "~/utils/supabase";

export const loader = async ({ request }: { request: Request }) => {
  const responseHeaders = new Headers();
  const supabase = createSupaBaseServerClient(request, responseHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/", { headers: responseHeaders });
  return data({ ok: true }, { headers: responseHeaders });
};

const App = (): ReactElement<ReactElement> => {
  return <FLPHeading>Dashboard</FLPHeading>;
};
export default App;
