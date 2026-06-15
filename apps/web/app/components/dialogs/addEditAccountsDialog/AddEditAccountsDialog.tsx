import { type FC, useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaPencilAlt } from "react-icons/fa";
import { useFetcher, useLoaderData } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPButtonGroup from "~/components/core/buttons/FLPButtonGroup";
import FLPModal from "~/components/core/dialogs/FLPModal";
import FLPInput from "~/components/core/inputs/input/FLPInput";
import FLPSelect from "~/components/core/inputs/select/FLPSelect";
import FLPBox from "~/components/core/structure/FLPBox";
import { type AccountType, AccountTypeEnum } from "~/containers/accounts/utils";
import type { loader } from "~/routes/app.accounts._index";

const { CURRENT, SAVING, MORTGAGE, CREDIT_CARD, LOAN, OWED, INVESTMENT } = AccountTypeEnum;
const accountTypeArray = [CURRENT, SAVING, INVESTMENT, CREDIT_CARD, MORTGAGE, LOAN, OWED];
const accountTypes = {
  items: accountTypeArray.map((type) => ({ id: type, name: type })),
};

interface AddEditAccountsDialogBtnProp {
  accountId?: string;
  isEditAccount?: boolean;
  btnSize?: "sm" | "md" | "lg" | "icon";
  isIconButton?: boolean;
}

const AddEditAccountsDialogBtn: FC<AddEditAccountsDialogBtnProp> = ({
  accountId,
  btnSize = "md",
  isEditAccount,
  isIconButton = false,
}) => {
  const {
    accounts = [],
  }: {
    accounts?: { id?: string; name?: string; type?: AccountType }[];
  } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const contentRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpenModal = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const selectedAccount = useMemo(
    () =>
      accounts?.find(
        (account: { id?: string; name?: string; type?: AccountType }) => account.id === accountId,
      ),
    [accounts, accountId],
  ) ?? { name: "", type: accountTypeArray[0] };

  const [formInput, setFormInput] = useState<{
    name: string;
    type: AccountType[];
  }>({ name: selectedAccount.name || "", type: [selectedAccount.type || accountTypeArray[0]] });

  const onChangeNameInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormInput((prevState) => ({ ...prevState, name: value }));
  }, []);

  const onChangeTypeInput = useCallback((e: { value: string[] }) => {
    setFormInput((prevState) => ({ ...prevState, type: e.value as AccountType[] }));
  }, []);

  const onAddAccount = useCallback(() => {
    const { name, type } = formInput;
    fetcher.submit(
      {
        intent: "create",
        name,
        type: type?.[0] || "",
      },
      { method: "POST" },
    );
    handleCloseModal();
  }, [formInput, fetcher, handleCloseModal]);

  const onEditAccount = useCallback(() => {
    const { name, type } = formInput;
    fetcher.submit(
      {
        intent: "update",
        accountId: accountId || "",
        name,
        type: type?.[0] || "",
      },
      { method: "POST" },
    );
    handleCloseModal();
  }, [accountId, formInput, fetcher, handleCloseModal]);

  const handleRemoveAccount = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      fetcher.submit(
        {
          intent: "delete",
          accountId: accountId || "",
        },
        { method: "POST" },
      );
      handleCloseModal();
    },
    [accountId, fetcher, handleCloseModal],
  );

  const submitAction = useMemo(() => {
    return isEditAccount ? onEditAccount : onAddAccount;
  }, [isEditAccount, onAddAccount, onEditAccount]);

  return (
    <FLPModal
      additionalActionBtns={
        isEditAccount ? (
          <FLPButtonGroup>
            <FLPButton variant="destructive" onClick={handleRemoveAccount}>
              {t("delete")}
            </FLPButton>
          </FLPButtonGroup>
        ) : undefined
      }
      confirmButton={{ id: accountId, text: t(isEditAccount ? "save" : "addAccount") }}
      contentRef={contentRef}
      open={modalOpen}
      title={t(isEditAccount ? "editAccount" : "addAccount")}
      triggerBtn={
        isIconButton ? (
          <FLPButton
            size="icon"
            variant="ghost"
            onClick={handleOpenModal}
            style={{ borderRadius: "50%", width: "32px", height: "32px", padding: 0 }}
          >
            <FaPencilAlt size={12} />
          </FLPButton>
        ) : (
          <FLPButton size={btnSize} variant="outline" onClick={handleOpenModal}>
            {t(isEditAccount ? "edit" : "addAccount")}
          </FLPButton>
        )
      }
      onClose={() => setModalOpen(false)}
      onConfirm={submitAction}
    >
      <form id={accountId} onSubmit={(e) => e.preventDefault()}>
        <FLPBox display="flex" flexDirection="column" gap={4}>
          <FLPInput
            label="Name"
            name="name"
            placeholder={t("accountName")}
            value={formInput.name}
            onChange={onChangeNameInput}
          />
          <FLPSelect
            collection={accountTypes}
            label="Account Type"
            name="type"
            value={formInput.type}
            onValueChange={onChangeTypeInput}
          />
        </FLPBox>
      </form>
    </FLPModal>
  );
};

export default AddEditAccountsDialogBtn;
