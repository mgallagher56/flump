import { type FC, useCallback, useMemo } from 'react';

import {
  CardBody,
  CardFooter,
  CardHeader,
  type CardProps,
  Stack,
  Stat,
  StatArrow,
  StatHelpText,
  StatLabel,
  StatNumber
} from '@chakra-ui/react';
import { useLoaderData, useNavigate, useRevalidator } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import AccountDetailChart from '~/components/charts/AccountDetailChart';
import FLPButton from '~/components/core/buttons/FLPButton';
import FLPButtonGroup from '~/components/core/buttons/FLPButtonGroup';
import FLPHeading from '~/components/core/typography/FLPHeading';
import AddEditAccountsDialogBtn from '~/components/dialogs/addEditAccountsDialog.tsx/AddEditAccountsDialog';
import type { AccountDetail } from '~/containers/accounts/types';
import type { AccountTypeEnum } from '~/containers/accounts/utils';
import type { loader } from '~/routes/app.accounts._index';
import { monthYearSort } from '~/utils/accounts';
import supabase from '~/utils/supabase';
import { currentMonth, currentYear } from '~/utils/utils';

import FLPCard from './FLPCard';

interface AccountsCardProp extends Omit<CardProps, 'title'> {
  accountId: string;
  name: string;
  type: AccountTypeEnum;
}

const AccountsCard: FC<AccountsCardProp> = ({ accountId, name, type }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    user,
    accountDetails = []
  }: {
    user?: { id?: string };
    accountDetails?: AccountDetail[];
  } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();

  const sortedAccountDetails = useMemo(() => {
    return accountDetails.filter((account) => account.account_id === accountId).sort(monthYearSort);
  }, [accountDetails, accountId]);

  const currentMonthIndex = sortedAccountDetails.findIndex(
    (account) => account.month === currentMonth && account.year === currentYear
  );

  const accountDetailYear = useMemo(() => {
    if (sortedAccountDetails.length === 12) return sortedAccountDetails;

    return sortedAccountDetails.slice(currentMonthIndex - 11, currentMonthIndex + 1);
  }, [currentMonthIndex, sortedAccountDetails]);

  const accountBalance = accountDetailYear[11]?.value;
  const prevAccountBalance = accountDetailYear[10]?.value;
  const secondPreviousAccountBalance = accountDetailYear[9]?.value;

  const handleRemoveAccount = useCallback(
    async (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      await supabase.from('accounts').delete().eq('user_id', user.id).eq('id', accountId);
      revalidate();
    },
    [accountId, revalidate, user.id]
  );

  const onCardClick = useCallback(() => navigate(`/app/accounts/${accountId}`), [accountId, navigate]);

  return (
    <FLPCard
      direction="column"
      display="flex"
      gap={3}
      height="325px"
      id={accountId}
      justifyContent="space-between"
      marginY={5}
      padding={5}
      title={name}
      width="250px"
      onClick={onCardClick}
    >
      <CardHeader display="flex" flexDirection="column" gap={1} padding={0}>
        <FLPHeading as="h5" color="grey.500" size="xs">{`${type} ${t('account')}`}</FLPHeading>
        <FLPHeading as="h4" color="blue.500" fontWeight="bold" size="lg">
          {name}
        </FLPHeading>
      </CardHeader>
      <Stack alignItems="center" direction="row" display="flex" justifyContent="space-between">
        {!!prevAccountBalance && (
          <Stat size="xs">
            <StatLabel>{`${t('previous')}:`}</StatLabel>
            <StatNumber>
              {Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(
                prevAccountBalance
              )}
            </StatNumber>
            {!!secondPreviousAccountBalance && (
              <StatHelpText>
                {secondPreviousAccountBalance > prevAccountBalance ? (
                  <StatArrow type="decrease" />
                ) : (
                  <StatArrow type="increase" />
                )}
                {`${Math.round(
                  ((prevAccountBalance - secondPreviousAccountBalance) / secondPreviousAccountBalance) * 100
                )}%`}
              </StatHelpText>
            )}
          </Stat>
        )}
        {!!accountBalance && (
          <Stat size="xs">
            <StatLabel>{`${t('current')}:`}</StatLabel>
            <StatNumber>
              {Intl.NumberFormat('en-GB', {
                style: 'currency',
                currency: 'GBP',
                maximumFractionDigits: 0
              }).format(accountBalance)}
            </StatNumber>
            {!!prevAccountBalance && (
              <StatHelpText>
                {prevAccountBalance > accountBalance ? <StatArrow type="decrease" /> : <StatArrow type="increase" />}
                {`${Math.round(((accountBalance - prevAccountBalance) / prevAccountBalance) * 100)}%`}
              </StatHelpText>
            )}
          </Stat>
        )}
      </Stack>
      <CardBody justifyContent="flex-end" padding={0}>
        {!!accountDetailYear.length && <AccountDetailChart accountDetails={accountDetailYear} />}
      </CardBody>
      <CardFooter justifyContent="flex-end" padding={0}>
        <FLPButtonGroup justifyContent="flex-end" zIndex="10">
          <AddEditAccountsDialogBtn accountId={accountId} btnSize="sm" isEditAccount={true} />
          <FLPButton colorScheme="red" size="sm" onClick={handleRemoveAccount}>
            {t('delete')}
          </FLPButton>
        </FLPButtonGroup>
      </CardFooter>
    </FLPCard>
  );
};

export default AccountsCard;
