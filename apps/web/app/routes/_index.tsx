import type { ReactElement } from 'react';

import { data, type MetaFunction } from 'react-router';
import type { Database } from 'db_types';
import FLPBox from '~/components/core/structure/FLPBox';
import FLPHeading from '~/components/core/typography/FLPHeading';
import { createSupaBaseServerClient } from '~/utils/supabase';

export const meta: MetaFunction = (): { title: string }[] => [{ title: 'flump' }];

export const handle = {
  i18n: ['common', 'home']
};

export type Employee = Database['public']['Tables']['employees']['Row'];

export const loader = async ({ request }: { request: Request }) => {
  const response = new Response();
  const supabase = createSupaBaseServerClient(request);
  const { data: employees } = await supabase.from('employees').select('*');
  return data({ employees }, { headers: response.headers });
};

const Index = (): ReactElement => {
  return (
    <FLPBox as="main">
      <FLPHeading>Home Page</FLPHeading>
    </FLPBox>
  );
};

export default Index;
