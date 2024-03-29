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
import AddEditAccountsDialogBtn from '~/components/dialogs/addEditAccountsDialog.tsx/AddEditAccountsDialog';
import type { AccountDetail } from '~/containers/accounts/types';
import type { AccountTypeEnum } from '~/containers/accounts/utils';
import type { loader } from '~/routes/app.accounts._index';
import { monthYearSort } from '~/utils/accounts';
import supabase from '~/utils/supabase';
import { currentMonth, currentYear } from '~/utils/utils';

import FLPButton from '../buttons/FLPButton';
import FLPButtonGroup from '../buttons/FLPButtonGroup';
import FLPHeading from '../typography/FLPHeading';
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
      id={accountId}
      title={name}
      padding={5}
      marginY={5}
      width="250px"
      height="325px"
      display="flex"
      direction="column"
      justifyContent="space-between"
      gap={3}
      onClick={onCardClick}
    >
      <CardHeader display="flex" gap={1} flexDirection="column" padding={0}>
        <FLPHeading color="grey.500" as="h5" size="xs">{`${type} ${t('account')}`}</FLPHeading>
        <FLPHeading color="blue.500" as="h4" size="lg" fontWeight="bold">
          {name}
        </FLPHeading>
      </CardHeader>
      <Stack display="flex" direction="row" justifyContent="space-between" alignItems="center">
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
      <CardBody padding={0} justifyContent="flex-end">
        {!!accountDetailYear.length && <AccountDetailChart accountDetails={accountDetailYear} />}
      </CardBody>
      <CardFooter justifyContent="flex-end" padding={0}>
        <FLPButtonGroup justifyContent="flex-end" zIndex="10">
          <AddEditAccountsDialogBtn btnSize="sm" accountId={accountId} isEditAccount={true} />
          <FLPButton size="sm" colorScheme="red" onClick={handleRemoveAccount}>
            {t('delete')}
          </FLPButton>
        </FLPButtonGroup>
      </CardFooter>
    </FLPCard>
  );
};

export default AccountsCard;
