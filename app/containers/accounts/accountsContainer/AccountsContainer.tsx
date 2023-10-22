import type { FC } from 'react';
import { Fragment, useMemo } from 'react';

import { useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import AccountsCard from '~/components/core/cards/AccountsCard';
import FLPBox from '~/components/core/structure/FLPBox';
import FLPHeading from '~/components/core/typography/FLPHeading';
import type { loader } from '~/routes/app.accounts._index';

import AddEditAccountsDialogBtn from '../../../components/dialogs/addEditAccountsDialog.tsx/AddEditAccountsDialog';
import { AccountTypeEnum, isAccountTypeValid } from '../utils';

const { CURRENT, SAVING, MORTGAGE, CREDIT_CARD, LOAN, OWED } = AccountTypeEnum;

const AccountsContainer: FC = () => {
  const { t } = useTranslation();
  const { accounts } = useLoaderData<typeof loader>();
  const accountTypeArr = useMemo(() => [CURRENT, SAVING, CREDIT_CARD, MORTGAGE, LOAN, OWED], []);

  return (
    <>
      <FLPBox mb={5} display="flex" flexDirection="row" justifyContent="space-between">
        <FLPHeading size="xl" as="h1">
          {t('accounts')}
        </FLPHeading>
        <AddEditAccountsDialogBtn />
      </FLPBox>
      {accountTypeArr.map((accountType) => {
        return (
          <Fragment key={accountType}>
            {isAccountTypeValid(accountType, accounts) && (
              <FLPHeading as="h2" size="lg">
                {accountType}
              </FLPHeading>
            )}
            <FLPBox display="flex" flexWrap="wrap" gap={5}>
              {accounts.map(
                ({ name, id, type }: { name?: string; id?: string; type?: AccountTypeEnum | string }) =>
                  type === accountType && <AccountsCard key={id} accountId={id} name={name} type={type} />
              )}
            </FLPBox>
          </Fragment>
        );
      })}
    </>
  );
};

export default AccountsContainer;
