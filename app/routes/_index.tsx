import type { ReactElement } from 'react';
import { useMemo } from 'react';

import type { LoaderArgs, V2_MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import FLPBox from '~/components/core/structure/FLPBox';
import FLPHeading from '~/components/core/typography/FLPHeading';
import UserLogin from '~/components/navigation/UserLogin';
import TabsContainer from '~/containers/TabsContainer';
import { getTabsData } from '~/utils/index.utils';

import supabase from '../utils/supabase';

export const meta: V2_MetaFunction = (): { title: string }[] => [{ title: 'flump' }];

export const handle = {
  i18n: ['common', 'home']
};

export type Employee = Awaited<ReturnType<typeof loader>>['employees'][0];

export const loader = async ({ ...args }: LoaderArgs) => {
  const { data } = await supabase.from('employees').select('*');
  return { employees: data };
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
      <TabsContainer data={tabsData} />
      <UserLogin />
    </FLPBox>
  );
};

export default Index;
