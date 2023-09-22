import { type FC, useCallback, useMemo, useState } from 'react';

import { Form, useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import FLPButton from '~/components/core/buttons/FLPButton';
import FLPModal from '~/components/core/dialogs/FLPModal';
import FLPInput from '~/components/core/input/FLPInput';
import FLPBox from '~/components/core/structure/FLPBox';
import type { loader } from '~/root';
import supabase from '~/utils/supabase';

interface AddEditAccountsDialogBtnProp {
  accountId?: string;
  isEditAccount?: boolean;
}

const AddEditAccountsDialogBtn: FC<AddEditAccountsDialogBtnProp> = ({ accountId, isEditAccount }) => {
  const { user } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const [formInput, setFormInput] = useState<{
    name: string;
    type: string;
  }>({ name: '', type: '' });

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

  const onAddAccount = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();
      const { name, type } = formInput;
      const { data } = await supabase.from('accounts').insert([{ name, type, user_id: user?.id }]);
      console.log(data);
    },
    [formInput, user?.id]
  );

  const onEditAccount = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();
      const newName = formInput.name;
      const newType = formInput.type;
      await supabase
        .from('accounts')
        .update({ name: newName, type: newType })
        .eq('user_id', user?.id)
        .eq('id', accountId);
    },
    [accountId, formInput.name, formInput.type, user?.id]
  );

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
      content={
        <Form defaultValue={''} onSubmit={submitAction}>
          <FLPBox display="flex" flexDirection="column" gap={4}>
            <FLPInput label="Name" name="name" placeholder={t('accountName')} onChange={onChangeFormInput} />
            <FLPInput label="Account Type" name="type" placeholder={t('accountType')} onChange={onChangeFormInput} />
          </FLPBox>
        </Form>
      }
      title={t('addAccount')}
      onConfirm={submitAction}
    />
  );
};

export default AddEditAccountsDialogBtn;
