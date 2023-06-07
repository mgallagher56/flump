import { useMemo } from 'react';

import type { V2_MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import FLPButtonGroup from '~/components/core/buttons/FLPButtonGroup';
import FLPLinkButton from '~/components/core/buttons/FLPLinkButton';
import FLPBox from '~/components/core/structure/FLPBox';
import FLPHeading from '~/components/core/typography/FLPHeading';
import TabsContainer from '~/containers/TabsContainer';

import supabase from '../utils/supabase';

export const meta: V2_MetaFunction = () => [{ title: 'flump' }];

const getTabsData = (employees: any) => [
  {
    label: 'Home',
    value: 'flp-home',
    content: (
      <main>
        <FLPBox>
          <FLPButtonGroup>
            <FLPLinkButton to="/join">Sign up</FLPLinkButton>
            <FLPLinkButton to="/login">Log in</FLPLinkButton>
          </FLPButtonGroup>
          {employees.map((employee) => (
            <FLPBox key={employee.id}>
              <h3>{employee.name}</h3>
              <p>{employee.department}</p>
            </FLPBox>
          ))}
        </FLPBox>
      </main>
    )
  },
  {
    label: 'Accounts',
    value: 'flp-about',
    content: (
      <main>
        <FLPBox>
          <FLPHeading as="h1">Accounts</FLPHeading>
        </FLPBox>
      </main>
    )
  },
  {
    label: 'Contact',
    value: 'flp-contact',
    content: (
      <main>
        <FLPBox>
          <FLPHeading as="h1">Contact</FLPHeading>
        </FLPBox>
      </main>
    )
  }
];

export default function Index() {
  const { employees } = useLoaderData();
  const tabsData = useMemo(() => getTabsData(employees), [employees]);

  return <TabsContainer orientation="vertical" data={tabsData} />;
}

export const loader = async () => {
  const { data: employees } = await supabase.from('employees').select('*');
  return { employees };
};
