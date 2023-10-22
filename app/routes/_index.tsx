import type { ReactElement } from 'react';

import { json, type MetaFunction } from '@remix-run/node';
import FLPBox from '~/components/core/structure/FLPBox';
import FLPHeading from '~/components/core/typography/FLPHeading';

import type { Database } from 'db_types';

import { createSupaBaseServerClient } from '../utils/supabase';

export const meta: MetaFunction = (): { title: string }[] => [{ title: 'flump' }];

export const handle = {
  i18n: ['common', 'home']
};

export type Employee = Database['public']['Tables']['employees']['Row'];

export const loader = async ({ request }: { request: Request }) => {
  const response = new Response();
  const supabase = createSupaBaseServerClient({ request, response });
  const { data } = await supabase.from('employees').select('*');
  return json({ employees: data }, { headers: response.headers });
};

const Index = (): ReactElement => {
  return (
    <FLPBox as="main">
      <FLPHeading>Home Page</FLPHeading>
    </FLPBox>
  );
};

export default Index;
