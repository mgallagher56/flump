import type { ReactElement } from 'react';

import { redirect, type RedirectFunction } from 'react-router';
import FLPHeading from '~/components/core/typography/FLPHeading';
import { createSupaBaseServerClient } from '~/utils/supabase';

export const loader = async ({
  request
}: {
  request: Request;
}): Promise<
  | ReturnType<RedirectFunction>
  | {
      ok: boolean;
    }
> => {
  const response = new Response();
  const supabase = createSupaBaseServerClient({ request, response });
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return redirect('/');
  return { ok: true };
};

const App = (): ReactElement => {
  return <FLPHeading>Dashboard</FLPHeading>;
};
export default App;
