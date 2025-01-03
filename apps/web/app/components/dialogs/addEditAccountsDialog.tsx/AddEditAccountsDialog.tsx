import { type FC, useCallback, useMemo, useRef, useState } from 'react';

import { type ButtonProps, createListCollection } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { Form, useLoaderData, useRevalidator } from 'react-router';
import FLPButton from '~/components/core/buttons/FLPButton';
import FLPModal from '~/components/core/dialogs/FLPModal';
import FLPInput from '~/components/core/inputs/input/FLPInput';
import FLPSelect from '~/components/core/inputs/select/FLPSelect';
import FLPBox from '~/components/core/structure/FLPBox';
import { type AccountType, AccountTypeEnum } from '~/containers/accounts/utils';
import type { loader } from '~/routes/app.accounts._index';
import supabase from '~/utils/supabase';

const { CURRENT, SAVING, MORTGAGE, LOAN, OWED } = AccountTypeEnum;
const accountTypeArray = [CURRENT, SAVING, MORTGAGE, LOAN, OWED];
const accountTypes = createListCollection({
  items: accountTypeArray.map((type) => ({ id: type, name: type })),
  itemToString: (item) => item.name,
  itemToValue: (item) => item.id
});

interface AddEditAccountsDialogBtnProp {
  accountId?: string;
  isEditAccount?: boolean;
  btnSize?: ButtonProps['size'];
}

const AddEditAccountsDialogBtn: FC<AddEditAccountsDialogBtnProp> = ({ accountId, btnSize, isEditAccount }) => {
  const {
    accounts = [],
    user
  }: {
    accounts?: { id?: string; name?: string; type?: AccountType }[];
    user?: { id?: string };
  } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const { revalidate } = useRevalidator();
  const contentRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpenModal = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setModalOpen(true);
    },
    [setModalOpen]
  );

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
    type: AccountType[];
  }>({ name: selectedAccount.name, type: [selectedAccount.type] });

  const onChangeNameInput = useCallback(
    (event: {
      target: {
        name: string;
        value: AccountType | string;
      };
    }) => {
      const { value } = event.target;
      setFormInput((prevState) => ({ ...prevState, name: value }));
    },
    [setFormInput]
  );

  const onChangeTypeInput = useCallback(
    (e: { value: string[] }) => {
      setFormInput((prevState) => ({ ...prevState, type: e.value }));
    },
    [setFormInput]
  );

  const onAddAccount = useCallback(async () => {
    const { name, type } = formInput as { name: string; type: AccountTypeEnum[] };
    const { data } = await supabase
      .from('accounts')
      .insert([{ name, type: type?.[0], user_id: user?.id }])
      .select();

    const year = new Date().getFullYear();
    const currentYearValues = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      year,
      value: 0,
      account_id: data[0].id
    }));

    await supabase.from('account_details').insert(currentYearValues);
    handleCloseModal();
    revalidate();
  }, [formInput, handleCloseModal, revalidate, user?.id]);

  const onEditAccount = useCallback(async () => {
    const newName = formInput.name;
    const newType = formInput.type[0] as AccountTypeEnum;
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
      confirmButton={{ id: accountId, text: t(isEditAccount ? 'save' : 'addAccount') }}
      contentRef={contentRef}
      open={modalOpen}
      title={t(isEditAccount ? 'editAccount' : 'addAccount')}
      triggerBtn={
        <FLPButton colorPalette="green" size={btnSize} variant={'outline'} onClick={handleOpenModal}>
          {t(isEditAccount ? 'edit' : 'addAccount')}
        </FLPButton>
      }
      onClose={() => setModalOpen(false)}
      onConfirm={submitAction}
    >
      <Form defaultValue={''} id={accountId} onSubmit={submitAction}>
        <FLPBox display="flex" flexDirection="column" gap={4}>
          <FLPInput
            label="Name"
            name="name"
            placeholder={t('accountName')}
            value={formInput.name}
            onChange={onChangeNameInput}
          />
          <FLPSelect
            collection={accountTypes}
            label="Account Type"
            name="type"
            portalRef={contentRef}
            value={formInput.type}
            onValueChange={onChangeTypeInput}
          />
        </FLPBox>
      </Form>
    </FLPModal>
  );
};

export default AddEditAccountsDialogBtn;
