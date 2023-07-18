import { type FC, useCallback } from 'react';

import type { CardProps } from '@chakra-ui/react';
import { useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import type { AccountTypeEnum } from '~/containers/accounts/utils';
import AddEditAccountsDialogBtn from '~/containers/dialogs/addEditAccountsDialog.tsx/AddEditAccountsDialog';
import supabase from '~/utils/supabase';

import FLPButton from '../buttons/FLPButton';
import FLPButtonGroup from '../buttons/FLPButtonGroup';
import FLPBox from '../structure/FLPBox';
import FLPText from '../typography/FLPText';
import FLPCard from './FLPCard';

interface AccountsCardProp extends Omit<CardProps, 'title'> {
  accountId: string;
  name: string;
  type: AccountTypeEnum;
}

const AccountsCard: FC<AccountsCardProp> = ({ accountId, name, type }) => {
  const { t } = useTranslation();
  const { user } = useLoaderData();

  const handleRemoveAccount = useCallback(async () => {
    await supabase
      .from('accounts')
      .delete()
      .eq('user_id', user.id)
      .eq('id', accountId);
  }, [accountId, user.id]);

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
    >
      <FLPBox display="flex" gap="3" flexDirection="column">
        <FLPText fontWeight="bold">{name}</FLPText>
        <FLPText>{`${type} ${t('account')}`}</FLPText>
      </FLPBox>
      <FLPButtonGroup justifyContent="flex-end">
        <AddEditAccountsDialogBtn accountId={accountId} isEditAccount={true} />
        <FLPButton colorScheme="red" onClick={handleRemoveAccount}>
          {t('remove')}
        </FLPButton>
      </FLPButtonGroup>
    </FLPCard>
  );
};

export default AccountsCard;
