import { redirect } from '@remix-run/node';
import type { LoaderArgs, TypedResponse } from '@remix-run/node';
import { createSupaBaseServerClient } from '~/utils/supabase';

export const loader = async ({ request }: LoaderArgs): Promise<TypedResponse<never>> => {
  const response = new Response();
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (code) {
    const supabaseClient = createSupaBaseServerClient({
      request,
      response
    });
    await supabaseClient.auth.exchangeCodeForSession(code);
  }

  return redirect('/', { headers: response.headers });
};
