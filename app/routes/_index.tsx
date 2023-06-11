import type { ReactElement } from 'react';
import { useMemo } from 'react';

import type { SerializeFrom, V2_MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import FLPButtonGroup from '~/components/core/buttons/FLPButtonGroup';
import FLPLinkButton from '~/components/core/buttons/FLPLinkButton';
import FLPBox from '~/components/core/structure/FLPBox';
import type { TabData } from '~/components/core/tabs/types';
import FLPHeading from '~/components/core/typography/FLPHeading';
import TabsContainer from '~/containers/TabsContainer';

import supabase from '../utils/supabase';

interface Employee {
  id?: string;
  name?: string;
  department?: string;
}

export const meta: V2_MetaFunction = (): { title: string }[] => [{ title: 'flump' }];

const getTabsData = (employees: Employee[]): TabData[] => [
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
          {employees.map(
            (employee): ReactElement => (
              <FLPBox key={employee.id}>
                <h3>{employee.name}</h3>
                <p>{employee.department}</p>
              </FLPBox>
            )
          )}
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

export default function Index(): ReactElement {
  const {
    employees
  }: SerializeFrom<{
    employees: Employee[];
  }> = useLoaderData();
  const tabsData = useMemo(() => getTabsData(employees), [employees]);

  return <TabsContainer orientation="vertical" data={tabsData} />;
}

export const loader = async (): Promise<{
  employees: Employee[];
}> => {
  const {
    data: employees
  }: {
    data: Employee[];
  } = await supabase.from('employees').select('*');
  return { employees };
};
