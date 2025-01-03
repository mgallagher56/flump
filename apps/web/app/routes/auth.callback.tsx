import { redirect } from 'react-router';
import type { RedirectFunction } from 'react-router';
import { createSupaBaseServerClient } from '~/utils/supabase';

export const loader = async ({ request }: { request: Request }): Promise<ReturnType<RedirectFunction>> => {
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
