import { type FC, useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCheckCircle, FaLock, FaPencilAlt, FaShieldAlt, FaUniversity } from "react-icons/fa";
import { useFetcher, useLoaderData } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPButtonGroup from "~/components/core/buttons/FLPButtonGroup";
import FLPModal from "~/components/core/dialogs/FLPModal";
import FLPInput from "~/components/core/inputs/input/FLPInput";
import FLPSelect from "~/components/core/inputs/select/FLPSelect";
import FLPBox from "~/components/core/structure/FLPBox";
import FLPText from "~/components/core/typography/FLPText";
import { type AccountType, AccountTypeEnum } from "~/containers/accounts/utils";
import type { loader } from "~/routes/app.accounts._index";

const { CURRENT, SAVING, MORTGAGE, CREDIT_CARD, LOAN, OWED, INVESTMENT, PENSION } = AccountTypeEnum;
const accountTypeArray = [CURRENT, SAVING, INVESTMENT, PENSION, CREDIT_CARD, MORTGAGE, LOAN, OWED];
const accountTypes = {
  items: accountTypeArray.map((type) => ({ id: type, name: type })),
};

const POPULAR_BANKS = [
  { id: "monzo", name: "Monzo Bank", color: "#ff4f5e", desc: "Current & savings pots" },
  { id: "starling", name: "Starling Bank", color: "#00aeef", desc: "Current & spaces" },
  { id: "hsbc", name: "HSBC Bank", color: "#db0011", desc: "Current, savings & mortgage" },
  { id: "barclays", name: "Barclays", color: "#00aeef", desc: "Everyday & platinum cards" },
  { id: "revolut", name: "Revolut", color: "#111118", desc: "Multi-currency & savings" },
  { id: "santander", name: "Santander", color: "#ec0000", desc: "123 Current & ISA" },
];

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
    accounts?: { id?: string; name?: string; type?: AccountType; balance?: number }[];
  } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const contentRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [entryMethod, setEntryMethod] = useState<"manual" | "bank">("manual");
  const [selectedBank, setSelectedBank] = useState<string>("monzo");

  const selectedAccount = useMemo(
    () =>
      accounts?.find(
        (account: { id?: string; name?: string; type?: AccountType; balance?: number }) =>
          account.id === accountId,
      ),
    [accounts, accountId],
  ) ?? { name: "", type: accountTypeArray[0], balance: undefined };

  const [formInput, setFormInput] = useState<{
    name: string;
    type: AccountType[];
    balance: string;
  }>({
    name: selectedAccount.name || "",
    type: [selectedAccount.type || accountTypeArray[0]],
    balance: selectedAccount.balance !== undefined ? String(selectedAccount.balance) : "",
  });

  const handleOpenModal = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setEntryMethod("manual");
      setSelectedBank("monzo");
      setFormInput({
        name: isEditAccount ? selectedAccount.name || "" : "",
        type: [isEditAccount ? selectedAccount.type || accountTypeArray[0] : accountTypeArray[0]],
        balance:
          isEditAccount && selectedAccount.balance !== undefined
            ? String(selectedAccount.balance)
            : "",
      });
      setModalOpen(true);
    },
    [isEditAccount, selectedAccount.balance, selectedAccount.name, selectedAccount.type],
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const onChangeNameInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormInput((prevState) => ({ ...prevState, name: value }));
  }, []);

  const onChangeBalanceInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormInput((prevState) => ({ ...prevState, balance: value }));
  }, []);

  const onChangeTypeInput = useCallback((e: { value: string[] }) => {
    setFormInput((prevState) => ({ ...prevState, type: e.value as AccountType[] }));
  }, []);

  const onAddAccount = useCallback(() => {
    const { name, type, balance } = formInput;
    fetcher.submit(
      {
        intent: "create",
        name,
        type: type?.[0] || "",
        ...(balance !== "" ? { balance } : {}),
      },
      { method: "POST" },
    );
    handleCloseModal();
  }, [formInput, fetcher, handleCloseModal]);

  const onConnectBank = useCallback(() => {
    fetcher.submit(
      {
        intent: "connectBank",
        institutionId: selectedBank,
      },
      { method: "POST" },
    );
    handleCloseModal();
  }, [fetcher, handleCloseModal, selectedBank]);

  const onEditAccount = useCallback(() => {
    const { name, type, balance } = formInput;
    fetcher.submit(
      {
        intent: "update",
        accountId: accountId || "",
        name,
        type: type?.[0] || "",
        ...(balance !== "" ? { balance } : {}),
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
    if (isEditAccount) return onEditAccount;
    return entryMethod === "bank" ? onConnectBank : onAddAccount;
  }, [isEditAccount, entryMethod, onConnectBank, onAddAccount, onEditAccount]);

  const selectedBankObj = POPULAR_BANKS.find((b) => b.id === selectedBank);
  const confirmBtnText = isEditAccount
    ? t("save")
    : entryMethod === "bank"
      ? `Connect ${selectedBankObj?.name || "Bank"}`
      : t("addAccount");

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
      confirmButton={{ id: accountId, text: confirmBtnText }}
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
      {!isEditAccount && (
        <div
          style={{
            display: "flex",
            backgroundColor: "var(--colors-surface-sunken)",
            border: "1px solid var(--colors-border-subtle)",
            padding: "4px",
            borderRadius: "8px",
            gap: "4px",
            marginBottom: "16px",
          }}
        >
          <button
            type="button"
            onClick={() => setEntryMethod("manual")}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              border: entryMethod === "manual" ? "1px solid var(--colors-border)" : "none",
              backgroundColor: entryMethod === "manual" ? "var(--colors-card)" : "transparent",
              color:
                entryMethod === "manual"
                  ? "var(--colors-text-primary)"
                  : "var(--colors-text-muted)",
              transition: "all 0.15s ease",
            }}
          >
            Manual Entry
          </button>
          <button
            type="button"
            onClick={() => setEntryMethod("bank")}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              border: entryMethod === "bank" ? "1px solid var(--colors-border)" : "none",
              backgroundColor: entryMethod === "bank" ? "var(--colors-card)" : "transparent",
              color:
                entryMethod === "bank" ? "var(--colors-text-primary)" : "var(--colors-text-muted)",
              transition: "all 0.15s ease",
            }}
          >
            Connect to Bank
          </button>
        </div>
      )}

      {entryMethod === "manual" ? (
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
            <FLPInput
              label="Balance"
              name="balance"
              placeholder="0.00"
              type="number"
              value={formInput.balance}
              onChange={onChangeBalanceInput}
            />
          </FLPBox>
        </form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            <FaShieldAlt color="#10b981" size={14} />
            <FLPText color="text.muted" fontSize="xs">
              FCA regulated Open Banking. 256-bit encrypted read-only connection.
            </FLPText>
          </div>

          <FLPText color="text.muted" fontSize="xs">
            Select your UK financial institution to securely link accounts:
          </FLPText>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "8px",
            }}
          >
            {POPULAR_BANKS.map((bank) => {
              const isSelected = selectedBank === bank.id;
              return (
                <button
                  key={bank.id}
                  type="button"
                  onClick={() => setSelectedBank(bank.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px",
                    borderRadius: "8px",
                    border: isSelected
                      ? "2px solid var(--colors-primary)"
                      : "1px solid var(--colors-border-subtle)",
                    backgroundColor: isSelected
                      ? "rgba(99, 99, 241, 0.08)"
                      : "var(--colors-surface)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: bank.color,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <FLPText fontSize="sm" fontWeight="bold">
                      {bank.name}
                    </FLPText>
                    <FLPText
                      color="text.muted"
                      fontSize="xs"
                      style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {bank.desc}
                    </FLPText>
                  </div>
                  {isSelected && <FaCheckCircle color="var(--colors-primary)" size={14} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </FLPModal>
  );
};

export default AddEditAccountsDialogBtn;
