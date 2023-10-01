import type { ReactElement } from 'react';
import { useMemo } from 'react';

import { json, type MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import FLPBox from '~/components/core/structure/FLPBox';
import FLPTabs from '~/components/core/tabs/FLPTabs';
import FLPHeading from '~/components/core/typography/FLPHeading';
import { getTabsData } from '~/utils/routesUtils/index/utils';

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
  const { t } = useTranslation();
  const { employees } = useLoaderData<typeof loader>();
  const tabsData = useMemo(() => getTabsData(employees, t), [employees, t]);

  return (
    <FLPBox as="main">
      <FLPHeading>Hero</FLPHeading>
      <FLPHeading>About</FLPHeading>
      <FLPHeading>Features</FLPHeading>
      <FLPTabs data={tabsData} />
    </FLPBox>
  );
};

export default Index;
