import type { FC } from 'react';

import { useLoaderData } from '@remix-run/react';
import FLPHeading from '~/components/core/typography/FLPHeading';
import type { loader } from '~/routes/app.accounts.$account';

const AccountDetailContainer: FC = () => {
  const { account } = useLoaderData<typeof loader>();
  console.log({ account });
  return (
    <>
      <FLPHeading as="h2" size="sm">{account?.type}</FLPHeading>
      <FLPHeading as="h1" size="xl" >{account?.name}</FLPHeading>
    </>
  );
};

export default AccountDetailContainer;
