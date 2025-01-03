import type { FC } from 'react';
import { Fragment, useMemo } from 'react';

import { useTranslation } from 'react-i18next';
import { useLoaderData } from 'react-router';
import AccountsCard from '~/components/core/cards/AccountsCard';
import FLPBox from '~/components/core/structure/FLPBox';
import FLPHeading from '~/components/core/typography/FLPHeading';
import AddEditAccountsDialogBtn from '~/components/dialogs/addEditAccountsDialog.tsx/AddEditAccountsDialog';
import { AccountTypeEnum, isAccountTypeValid } from '~/containers/accounts/utils';
import type { loader } from '~/routes/app.accounts._index';

const { CURRENT, SAVING, MORTGAGE, CREDIT_CARD, LOAN, OWED } = AccountTypeEnum;

const AccountsContainer: FC = () => {
  const { t } = useTranslation();
  const { accounts } = useLoaderData<typeof loader>();
  const accountTypeArr = useMemo(() => [CURRENT, SAVING, CREDIT_CARD, MORTGAGE, LOAN, OWED], []);

  return (
    <>
      <FLPBox display="flex" flexDirection="row" justifyContent="space-between" my={5}>
        <FLPHeading as="h1" size="xl">
          {t('accounts')}
        </FLPHeading>
        <AddEditAccountsDialogBtn />
      </FLPBox>
      <FLPBox display="flex" flexWrap="wrap" gap={10}>
        {accountTypeArr.map((accountType) => {
          return (
            isAccountTypeValid(accountType, accounts) && (
              <Fragment key={accountType}>
                <FLPBox>
                  <FLPHeading as="h2" size="lg">
                    {accountType}
                  </FLPHeading>
                  <FLPBox display="flex" flexWrap="wrap" gap={5}>
                    {accounts.map(
                      ({ name, id, type }: { name?: string; id?: string; type?: AccountTypeEnum | string }) =>
                        type === accountType && <AccountsCard key={id} accountId={id} name={name} type={type} />
                    )}
                  </FLPBox>
                </FLPBox>
              </Fragment>
            )
          );
        })}
      </FLPBox>
    </>
  );
};

export default AccountsContainer;
