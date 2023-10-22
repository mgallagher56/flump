import { type FC, useCallback, useMemo } from 'react';

import type { CardProps } from '@chakra-ui/react';
import { useLoaderData, useNavigate, useRevalidator } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import AddEditAccountsDialogBtn from '~/components/dialogs/addEditAccountsDialog.tsx/AddEditAccountsDialog';
import type { AccountTypeEnum } from '~/containers/accounts/utils';
import type { loader } from '~/routes/app.accounts._index';
import supabase from '~/utils/supabase';

import FLPButton from '../buttons/FLPButton';
import FLPButtonGroup from '../buttons/FLPButtonGroup';
import FLPBox from '../structure/FLPBox';
import FLPHeading from '../typography/FLPHeading';
import FLPText from '../typography/FLPText';
import FLPCard from './FLPCard';

interface AccountsCardProp extends Omit<CardProps, 'title'> {
  accountId: string;
  name: string;
  type: AccountTypeEnum;
}

const AccountsCard: FC<AccountsCardProp> = ({ accountId, name, type }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, accountBalances = [] } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();

  const accountBalance = useMemo(
    () =>
      accountBalances.find((account: { account_id?: string; value?: number }) => account.account_id === accountId)
        .value,
    [accountBalances, accountId]
  );

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
      height="300px"
      display="flex"
      direction="column"
      justifyContent="space-between"
      gap={2}
      onClick={onCardClick}
    >
      <FLPBox display="flex" gap="3" flexDirection="column">
        <FLPHeading as="h5" size="xs">{`${type} ${t('account')}`}</FLPHeading>
        <FLPText fontWeight="bold">{name}</FLPText>
        <FLPText>{`${t('balance')}: ${Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
          .format(accountBalance)
          .slice(0, -3)}
      `}</FLPText>
      </FLPBox>
      <FLPButtonGroup justifyContent="flex-end" zIndex="10">
        <AddEditAccountsDialogBtn accountId={accountId} isEditAccount={true} />
        <FLPButton colorScheme="red" onClick={handleRemoveAccount}>
          {t('remove')}
        </FLPButton>
      </FLPButtonGroup>
    </FLPCard>
  );
};

export default AccountsCard;
