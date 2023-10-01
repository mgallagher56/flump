import { type FC, useCallback, useMemo, useState } from 'react';

import { Form, useLoaderData, useRevalidator } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import FLPButton from '~/components/core/buttons/FLPButton';
import FLPModal from '~/components/core/dialogs/FLPModal';
import FLPInput from '~/components/core/inputs/input/FLPInput';
import FLPSelect from '~/components/core/inputs/select/FLPSelect';
import FLPBox from '~/components/core/structure/FLPBox';
import { type AccountType, AccountTypeEnum } from '~/containers/accounts/utils';
import type { loader } from '~/routes/app.accounts';
import supabase from '~/utils/supabase';

const { CURRENT, SAVING, MORTGAGE, LOAN, OWED } = AccountTypeEnum;
const accountTypeArray = [CURRENT, SAVING, MORTGAGE, LOAN, OWED];

interface AddEditAccountsDialogBtnProp {
  accountId?: string;
  isEditAccount?: boolean;
  name?: string;
  type?: string;
}

const AddEditAccountsDialogBtn: FC<AddEditAccountsDialogBtnProp> = ({ accountId, isEditAccount }) => {
  const { accounts = [], user } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const { revalidate } = useRevalidator();
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpenModal = useCallback(() => {
    setModalOpen(true);
  }, [setModalOpen]);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, [setModalOpen]);

  const selectedAccount: {
    name?: string;
    type?: AccountType;
  } = useMemo(
    () => accounts?.find((account: { id?: string; name?: string; type?: AccountType }) => account.id === accountId),
    [accounts, accountId]
  ) ?? { name: '', type: accountTypeArray[0] };

  const [formInput, setFormInput] = useState<{
    name: string;
    type: AccountType;
  }>({ name: selectedAccount.name, type: selectedAccount.type });

  const onChangeFormInput = useCallback(
    (event: {
      target: {
        name: string;
        value: AccountType | string;
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
    handleCloseModal();
    revalidate();
    console.log(data);
  }, [formInput, handleCloseModal, revalidate, user?.id]);

  const onEditAccount = useCallback(async () => {
    const newName = formInput.name;
    const newType = formInput.type;
    await supabase
      .from('accounts')
      .update({ name: newName, type: newType })
      .eq('user_id', user?.id)
      .eq('id', accountId);
    handleCloseModal();
    revalidate();
  }, [accountId, formInput.name, formInput.type, handleCloseModal, revalidate, user?.id]);

  const submitAction = useMemo(() => {
    return isEditAccount ? onEditAccount : onAddAccount;
  }, [isEditAccount, onAddAccount, onEditAccount]);

  return (
    <FLPModal
      triggerBtn={
        <FLPButton colorScheme="green" variant={'outline'} onClick={handleOpenModal}>
          {t(isEditAccount ? 'edit' : 'addAccount')}
        </FLPButton>
      }
      confirmButton={{ id: accountId, text: t(isEditAccount ? 'save' : 'addAccount') }}
      children={
        <Form id={accountId} defaultValue={''} onSubmit={submitAction}>
          <FLPBox display="flex" flexDirection="column" gap={4}>
            <FLPInput
              label="Name"
              name="name"
              placeholder={t('accountName')}
              value={formInput.name}
              onChange={onChangeFormInput}
            />
            <FLPSelect
              label="Account Type"
              name="type"
              defaultValue={accountTypeArray[0]}
              value={formInput.type}
              onChange={onChangeFormInput}
            >
              {accountTypeArray.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </FLPSelect>
          </FLPBox>
        </Form>
      }
      title={t('addAccount')}
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      onConfirm={submitAction}
    />
  );
};

export default AddEditAccountsDialogBtn;
