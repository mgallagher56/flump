import type { V2_MetaFunction } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { FLPButtonGroup } from '~/components/core/buttons/FLPButtonGroup';
import { FLPLinkButton } from '~/components/core/buttons/FLPLinkButton';
import { FLPBox } from '~/components/core/structure/FLPBox';

import supabase from '../utils/supabase';

export const meta: V2_MetaFunction = () => [{ title: 'Remix Notes' }];

export default function Index() {
  const { employees } = useLoaderData();

  return (
    <main>
      <FLPBox>
          <FLPButtonGroup>
            <FLPLinkButton colorScheme="blue" as={Link} to="/join">
              Sign up
            </FLPLinkButton>
            <FLPLinkButton colorScheme="blue" as={Link} to="/login">
              Log in
            </FLPLinkButton>
          </FLPButtonGroup>
        {employees.map((employee) => (
          <FLPBox key={employee.id}>
            <h3>{employee.name}</h3>
            <p>{employee.department}</p>
          </FLPBox>
        ))}
      </FLPBox>
    </main>
  );
}

export const loader = async () => {
  const { data: employees } = await supabase.from('employees').select('*');
  return { employees };
};
