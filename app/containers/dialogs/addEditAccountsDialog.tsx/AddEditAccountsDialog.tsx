import { type FC, useCallback, useMemo, useState } from 'react';

import { Form, useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import FLPButton from '~/components/core/buttons/FLPButton';
import FLPModal from '~/components/core/dialogs/FLPModal';
import FLPInput from '~/components/core/inputs/input/FLPInput';
import FLPBox from '~/components/core/structure/FLPBox';
import type { loader } from '~/routes/app.accounts';
import supabase from '~/utils/supabase';

interface AddEditAccountsDialogBtnProp {
  accountId?: string;
  isEditAccount?: boolean;
  name?: string;
  type?: string;
}

const AddEditAccountsDialogBtn: FC<AddEditAccountsDialogBtnProp> = ({ accountId, isEditAccount }) => {
  const { accounts = [], user } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const selectedAccount = useMemo(
    () => accounts?.find((account) => account.id === accountId),
    [accounts, accountId]
  ) ?? { name: '', type: '' };
  const [formInput, setFormInput] = useState<{
    name: string;
    type: string;
  }>({ name: selectedAccount.name, type: selectedAccount.type });

  const onChangeFormInput = useCallback(
    (event: {
      target: {
        name: string;
        value: string;
      };
    }) => {
      const { name, value } = event.target;
      setFormInput((prevState) => ({ ...prevState, [name]: value }));
    },
    [setFormInput]
  );

  const onAddAccount = useCallback(async () => {
    const { name, type } = formInput;
    const { data } = await supabase.from('accounts').insert([{ name, type, user_id: user?.id }]);
    console.log(data);
  }, [formInput, user?.id]);

  const onEditAccount = useCallback(async () => {
    const newName = formInput.name;
    const newType = formInput.type;
    await supabase
      .from('accounts')
      .update({ name: newName, type: newType })
      .eq('user_id', user?.id)
      .eq('id', accountId);
  }, [accountId, formInput.name, formInput.type, user?.id]);

  const submitAction = useMemo(
    () => (isEditAccount ? onEditAccount : onAddAccount),
    [isEditAccount, onAddAccount, onEditAccount]
  );

  return (
    <FLPModal
      triggerBtn={
        <FLPButton colorScheme="green" variant={'outline'}>
          {t(isEditAccount ? 'edit' : 'addAccount')}
        </FLPButton>
      }
      confirmButton={{ text: t(isEditAccount ? 'save' : 'addAccount') }}
      children={
        <Form defaultValue={''} onSubmit={submitAction}>
          <FLPBox display="flex" flexDirection="column" gap={4}>
            <FLPInput
              label="Name"
              name="name"
              placeholder={t('accountName')}
              value={formInput.name}
              onChange={onChangeFormInput}
            />
            <FLPInput
              label="Account Type"
              name="type"
              placeholder={t('accountType')}
              value={formInput.type}
              onChange={onChangeFormInput}
            />
          </FLPBox>
        </Form>
      }
      title={t('addAccount')}
      onConfirm={submitAction}
    />
  );
};

export default AddEditAccountsDialogBtn;
