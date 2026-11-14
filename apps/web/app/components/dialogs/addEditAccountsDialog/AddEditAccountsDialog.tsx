import {
  Button,
  CurrencyInput,
  controlProps,
  Dialog,
  FormField,
  Icon,
  Select,
  Tabs,
  TextInput,
} from "@repo/ui";
import { CheckCircle2, Globe, KeyRound, Pencil, ShieldCheck, TriangleAlert } from "lucide-react";
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFetcher, useLoaderData } from "react-router";
import {
  type AccountType,
  AccountTypeEnum,
  STUDENT_LOAN_PLAN_OPTIONS,
} from "~/containers/accounts/utils";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import type { loader } from "~/routes/app.accounts._index";
import { isSafeRedirectUrl } from "~/utils/safeRedirectUrl";
import {
  bankAvatar,
  bankGrid,
  bankName,
  bankNameRow,
  bankOption,
  bankStack,
  bankText,
  dialogFooterGroup,
  fieldStack,
  helperText,
  noticeBox,
  noticeRow,
  saveError,
  tabLabel,
  tabsWrap,
} from "./AddEditAccountsDialog.styles";

const {
  CURRENT,
  SAVING,
  MORTGAGE,
  CREDIT_CARD,
  LOAN,
  OWED,
  INVESTMENT,
  PENSION,
  PROPERTY,
  STUDENT_LOAN,
  OVERDRAFT,
} = AccountTypeEnum;
const accountTypeArray = [
  CURRENT,
  SAVING,
  INVESTMENT,
  PENSION,
  PROPERTY,
  CREDIT_CARD,
  OVERDRAFT,
  MORTGAGE,
  LOAN,
  STUDENT_LOAN,
  OWED,
];
const studentLoanPlans = {
  items: [{ id: "", name: "Choose a plan" }, ...STUDENT_LOAN_PLAN_OPTIONS.map((p) => ({ ...p }))],
};
const PLAN_REQUIRED_MESSAGE = "Choose a repayment plan";

const POPULAR_BANKS = [
  {
    id: "monzo",
    name: "Monzo Bank",
    desc: "Current and joint accounts, and pots",
    directSync: true,
  },
  {
    id: "starling",
    name: "Starling Bank",
    desc: "Current and joint accounts, and spaces",
    directSync: true,
  },
  {
    id: "trading212",
    name: "Trading 212",
    desc: "Cash balance of a Trading 212 account",
    directSync: true,
  },
  {
    id: "hsbc",
    name: "HSBC Bank",
    desc: "Current and savings accounts",
    directSync: true,
  },
  {
    id: "barclays",
    name: "Barclays",
    desc: "Current accounts and cards",
    directSync: true,
  },
  {
    id: "revolut",
    name: "Revolut",
    desc: "Multi-currency accounts",
    directSync: true,
  },
  {
    id: "santander",
    name: "Santander",
    desc: "Current accounts and ISAs",
    directSync: true,
  },
  {
    id: "natwest",
    name: "NatWest",
    desc: "Current accounts",
    directSync: true,
  },
  {
    id: "lloyds",
    name: "Lloyds Bank",
    desc: "Current accounts and cards",
    directSync: true,
  },
  {
    id: "chase",
    name: "Chase",
    desc: "Current and savings accounts",
    directSync: true,
  },
];

interface AccountOption {
  id?: string;
  name?: string;
  type?: AccountType;
  balance?: number;
  studentLoanPlan?: string | null;
}

interface AddEditAccountsDialogBtnProp {
  accountId?: string;
  isEditAccount?: boolean;
  btnSize?: "sm" | "md" | "lg" | "icon";
  isIconButton?: boolean;
  /** Style of the text button. The page's one primary action passes "primary" (E16 P7.4). */
  variant?: "primary" | "outline";
}

const AddEditAccountsDialogBtn: FC<AddEditAccountsDialogBtnProp> = ({
  accountId,
  btnSize = "md",
  isEditAccount,
  isIconButton = false,
  variant = "outline",
}) => {
  const {
    accounts = [],
    bankConnectionsEnabled = false,
  }: {
    accounts?: AccountOption[];
    bankConnectionsEnabled?: boolean;
  } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [entryMethod, setEntryMethod] = useState<"manual" | "bank">("manual");
  const [selectedBank, setSelectedBank] = useState<string>("monzo");
  const [bankAuthType, setBankAuthType] = useState<"token" | "oauth">("token");
  const [bankToken, setBankToken] = useState<string>("");
  const [bankError, setBankError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const accountName = accounts.find((account) => account.id === accountId)?.name;
  const editLabel = accountName ? `${t("editAccount")}: ${accountName}` : t("editAccount");
  const isConnecting = fetcher.state === "submitting" || fetcher.state === "loading";

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setConfirmDeleteOpen(false);
    setBankError(null);
  }, []);

  // Create, edit and delete keep the modal open until the action answers; only a success closes it.
  const saveOutcome = useFetcherOutcome(fetcher, { onSuccess: handleCloseModal });
  const deleteOutcome = useFetcherOutcome(fetcher, { onSuccess: handleCloseModal });
  const { dismiss: dismissSave } = saveOutcome;
  const { dismiss: dismissDelete } = deleteOutcome;
  // Only the bank connection flow is handled by the effect below.
  const bankFlowRef = useRef(false);

  const handleDismiss = useCallback(() => {
    handleCloseModal();
    dismissSave();
    dismissDelete();
  }, [handleCloseModal, dismissSave, dismissDelete]);

  useEffect(() => {
    if (!bankFlowRef.current || !fetcher.data) return;
    const res = fetcher.data as {
      success?: boolean;
      oauth?: boolean;
      redirectUrl?: string;
      error?: string;
      message?: string;
    };

    if (res.oauth && res.redirectUrl) {
      if (!isSafeRedirectUrl(res.redirectUrl)) {
        setBankError("We could not start the bank sign-in. Nothing was connected. Try again.");
        return;
      }
      window.location.href = res.redirectUrl;
      return;
    }

    if (res.error) {
      setBankError(res.error);
      return;
    }

    if (bankAuthType === "oauth" && !res.redirectUrl) {
      setBankError(
        res.message ||
          "We could not start the sign-in for this bank. Nothing was connected. Use an access token instead.",
      );
      return;
    }

    if (res.success) {
      handleCloseModal();
    }
  }, [fetcher.data, handleCloseModal, bankAuthType]);

  const selectedAccount: AccountOption = useMemo(
    () => accounts?.find((account) => account.id === accountId),
    [accounts, accountId],
  ) ?? { name: "", type: accountTypeArray[0], balance: undefined, studentLoanPlan: null };

  const [formInput, setFormInput] = useState<{
    name: string;
    type: AccountType[];
    balance: string;
    studentLoanPlan: string[];
  }>({
    name: selectedAccount.name || "",
    type: [selectedAccount.type || accountTypeArray[0]],
    studentLoanPlan: [selectedAccount.studentLoanPlan || ""],
    balance: selectedAccount.balance !== undefined ? String(selectedAccount.balance) : "",
  });

  const handleOpenModal = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setEntryMethod("manual");
      setSelectedBank("monzo");
      setBankAuthType("token");
      setBankToken("");
      setBankError(null);
      setPlanError(null);
      dismissSave();
      dismissDelete();
      setFormInput({
        name: isEditAccount ? selectedAccount.name || "" : "",
        type: [isEditAccount ? selectedAccount.type || accountTypeArray[0] : accountTypeArray[0]],
        studentLoanPlan: [(isEditAccount && selectedAccount.studentLoanPlan) || ""],
        balance:
          isEditAccount && selectedAccount.balance !== undefined
            ? String(selectedAccount.balance)
            : "",
      });
      setModalOpen(true);
    },
    [isEditAccount, selectedAccount, dismissSave, dismissDelete],
  );

  const onChangeNameInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormInput((prevState) => ({ ...prevState, name: value }));
  }, []);

  const onChangeBalanceInput = useCallback((value: number | null) => {
    setFormInput((prevState) => ({ ...prevState, balance: value === null ? "" : String(value) }));
  }, []);

  const onChangeTypeInput = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormInput((prevState) => ({ ...prevState, type: [e.target.value] as AccountType[] }));
  }, []);

  const onChangePlanInput = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlanError(null);
    setFormInput((prevState) => ({ ...prevState, studentLoanPlan: [e.target.value] }));
  }, []);

  const onAddAccount = useCallback(() => {
    const { name, type, balance, studentLoanPlan } = formInput;
    if (type?.[0] === STUDENT_LOAN && !studentLoanPlan[0]) {
      setPlanError(PLAN_REQUIRED_MESSAGE);
      return;
    }
    bankFlowRef.current = false;
    saveOutcome.begin();
    fetcher.submit(
      {
        intent: "create",
        name,
        type: type?.[0] || "",
        ...(type?.[0] === STUDENT_LOAN ? { studentLoanPlan: studentLoanPlan[0] ?? "" } : {}),
        ...(balance !== "" ? { balance } : {}),
      },
      { method: "POST" },
    );
  }, [formInput, fetcher, saveOutcome.begin]);

  const onConnectBank = useCallback(() => {
    setBankError(null);
    bankFlowRef.current = true;
    if (bankAuthType === "token") {
      if (!bankToken.trim()) {
        setBankError("Enter your access token");
        return;
      }
      fetcher.submit(
        {
          intent: "connectBank",
          institutionId: selectedBank,
          token: bankToken.trim(),
          authType: "token",
        },
        { method: "POST", action: "/app/accounts" },
      );
    } else {
      fetcher.submit(
        {
          intent: "connectBank",
          institutionId: selectedBank,
          authType: "oauth",
        },
        { method: "POST", action: "/app/accounts" },
      );
    }
  }, [bankAuthType, bankToken, fetcher, selectedBank]);

  const onEditAccount = useCallback(() => {
    const { name, type, balance, studentLoanPlan } = formInput;
    if (type?.[0] === STUDENT_LOAN && !studentLoanPlan[0]) {
      setPlanError(PLAN_REQUIRED_MESSAGE);
      return;
    }
    bankFlowRef.current = false;
    saveOutcome.begin();
    fetcher.submit(
      {
        intent: "update",
        accountId: accountId || "",
        name,
        type: type?.[0] || "",
        ...(type?.[0] === STUDENT_LOAN ? { studentLoanPlan: studentLoanPlan[0] ?? "" } : {}),
        ...(balance !== "" ? { balance } : {}),
      },
      { method: "POST" },
    );
  }, [accountId, formInput, fetcher, saveOutcome.begin]);

  const handleConfirmRemoveAccount = useCallback(() => {
    bankFlowRef.current = false;
    deleteOutcome.begin();
    fetcher.submit(
      {
        intent: "delete",
        accountId: accountId || "",
      },
      { method: "POST" },
    );
  }, [accountId, fetcher, deleteOutcome.begin]);

  const selectedBankObj = POPULAR_BANKS.find((b) => b.id === selectedBank) ?? POPULAR_BANKS[0];
  const isDirectSync = !!selectedBankObj.directSync;

  const onSwitchToManualForBank = useCallback(() => {
    setEntryMethod("manual");
    setFormInput((prev) => ({
      ...prev,
      name: `${selectedBankObj.name} Account`,
    }));
  }, [selectedBankObj.name]);

  const submitAction = useMemo(() => {
    if (isEditAccount) return onEditAccount;
    if (entryMethod === "bank") {
      if (isDirectSync) return onConnectBank;
      return onSwitchToManualForBank;
    }
    return onAddAccount;
  }, [
    isEditAccount,
    entryMethod,
    isDirectSync,
    onConnectBank,
    onSwitchToManualForBank,
    onAddAccount,
    onEditAccount,
  ]);

  const confirmBtnText = isEditAccount
    ? t("save")
    : entryMethod === "bank"
      ? isDirectSync
        ? isConnecting
          ? "Connecting"
          : bankAuthType === "token"
            ? `Connect ${selectedBankObj?.name || "bank"}`
            : `Sign in at ${selectedBankObj?.name || "bank"}`
        : `Add ${selectedBankObj?.name} by hand`
      : t("addAccount");

  const isConfirmDisabled = useMemo(() => {
    if (isConnecting || saveOutcome.pending || deleteOutcome.pending) return true;
    if (entryMethod === "bank" && isDirectSync && bankAuthType === "token" && !bankToken.trim()) {
      return true;
    }
    return false;
  }, [
    isConnecting,
    saveOutcome.pending,
    deleteOutcome.pending,
    entryMethod,
    isDirectSync,
    bankAuthType,
    bankToken,
  ]);

  const bankTokenLabel =
    selectedBank === "monzo"
      ? "Monzo access token"
      : selectedBank === "starling"
        ? "Starling access token"
        : selectedBank === "trading212"
          ? "Trading 212 API key"
          : `${selectedBankObj?.name} access token`;

  // Only Starling gets a placeholder: the hint already says where the other tokens come from.
  const bankTokenPlaceholder = selectedBank === "starling" ? "For example, eyJ…" : undefined;

  const bankTokenHint =
    selectedBank === "monzo"
      ? "Sign in at developers.monzo.com and copy your access token from the playground."
      : selectedBank === "starling"
        ? "In the Starling Developer Console, create an access token with the account:read and balance:read permissions."
        : selectedBank === "trading212"
          ? "In the Trading 212 app, go to Settings, then API. Create an API key and paste it here."
          : `Paste a read-only access token from ${selectedBankObj?.name}, or choose "Bank sign-in".`;

  return (
    <>
      {isIconButton ? (
        <Button aria-label={editLabel} size="icon" variant="ghost" onClick={handleOpenModal}>
          <Icon icon={Pencil} size="sm" />
        </Button>
      ) : (
        <Button
          size={btnSize === "icon" ? "md" : btnSize}
          variant={variant}
          onClick={handleOpenModal}
        >
          {t(isEditAccount ? "edit" : "addAccount")}
        </Button>
      )}
      <Dialog
        footer={
          <>
            {isEditAccount ? (
              <Button
                variant="danger"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setConfirmDeleteOpen(true);
                }}
              >
                {t("delete")}
              </Button>
            ) : null}
            <div className={dialogFooterGroup()}>
              <Button type="button" variant="ghost" onClick={handleDismiss}>
                Cancel
              </Button>
              <Button disabled={isConfirmDisabled} type="button" onClick={submitAction}>
                {confirmBtnText}
              </Button>
            </div>
          </>
        }
        id="account-dialog"
        open={modalOpen}
        title={t(isEditAccount ? "editAccount" : "addAccount")}
        onOpenChange={(open) => {
          if (!open) handleDismiss();
        }}
      >
        {isEditAccount && (
          <ConfirmDialog
            open={confirmDeleteOpen}
            onOpenChange={(open) => {
              setConfirmDeleteOpen(open);
              if (!open) deleteOutcome.dismiss();
            }}
            pending={deleteOutcome.pending}
            error={deleteOutcome.error}
            title={`Delete ${selectedAccount.name || "this account"}?`}
            description="Its balance history will be deleted too. This cannot be undone."
            confirmLabel="Delete account"
            tone="danger"
            onConfirm={handleConfirmRemoveAccount}
          />
        )}
        {!isEditAccount && bankConnectionsEnabled && (
          <Tabs
            aria-label="How to add the account"
            className={tabsWrap()}
            items={[
              { value: "manual", label: <span className={tabLabel()}>Add by hand</span> },
              { value: "bank", label: <span className={tabLabel()}>Connect a bank</span> },
            ]}
            value={entryMethod}
            onValueChange={(value) => setEntryMethod(value as "manual" | "bank")}
          />
        )}

        {entryMethod === "manual" ? (
          <form className={fieldStack()} id={accountId} onSubmit={(e) => e.preventDefault()}>
            <FormField label="Name">
              {(field) => (
                <TextInput
                  {...controlProps(field)}
                  name="name"
                  placeholder={t("accountName")}
                  value={formInput.name}
                  onChange={onChangeNameInput}
                />
              )}
            </FormField>
            <FormField label="Account type">
              {(field) => (
                <Select
                  {...controlProps(field)}
                  name="type"
                  options={accountTypeArray.map((type) => ({ value: type, label: type }))}
                  value={formInput.type?.[0] ?? ""}
                  onChange={onChangeTypeInput}
                />
              )}
            </FormField>
            {formInput.type?.[0] === STUDENT_LOAN ? (
              <FormField error={planError ?? undefined} label="Repayment plan">
                {(field) => (
                  <Select
                    {...controlProps(field)}
                    name="studentLoanPlan"
                    options={studentLoanPlans.items.map((plan) => ({
                      value: plan.id,
                      label: plan.name,
                    }))}
                    value={formInput.studentLoanPlan[0] ?? ""}
                    onChange={onChangePlanInput}
                  />
                )}
              </FormField>
            ) : null}
            <FormField label="Balance">
              {(field) => (
                <CurrencyInput
                  {...controlProps(field)}
                  name="balance"
                  placeholder="0.00"
                  value={formInput.balance === "" ? null : Number(formInput.balance)}
                  onValueChange={onChangeBalanceInput}
                />
              )}
            </FormField>
            {saveOutcome.error ? (
              <p role="alert" className={saveError()}>
                {saveOutcome.error}
              </p>
            ) : null}
          </form>
        ) : (
          <div className={bankStack()}>
            <div className={noticeRow()}>
              <Icon icon={ShieldCheck} size="sm" />
              <p className={helperText()}>
                Preview: paste your own read-only access token from your provider.
              </p>
            </div>

            <p className={helperText()}>Choose your bank</p>

            <div className={bankGrid()}>
              {POPULAR_BANKS.map((bank) => {
                const isSelected = selectedBank === bank.id;
                return (
                  <button
                    key={bank.id}
                    aria-pressed={isSelected}
                    className={bankOption({ selected: isSelected })}
                    type="button"
                    onClick={() => {
                      setSelectedBank(bank.id);
                      setBankError(null);
                    }}
                  >
                    <span aria-hidden="true" className={bankAvatar()}>
                      {bank.name.charAt(0)}
                    </span>
                    <span className={bankText()}>
                      <span className={bankNameRow()}>
                        <span className={bankName()}>{bank.name}</span>
                      </span>
                      <span className={helperText()}>{bank.desc}</span>
                    </span>
                    {isSelected && <Icon icon={CheckCircle2} size="sm" />}
                  </button>
                );
              })}
            </div>

            {isDirectSync ? (
              <>
                <Tabs
                  aria-label="Connection method"
                  items={[
                    {
                      value: "token",
                      label: (
                        <span className={tabLabel()}>
                          <Icon icon={KeyRound} size="sm" />
                          Access token
                        </span>
                      ),
                    },
                    {
                      value: "oauth",
                      label: (
                        <span className={tabLabel()}>
                          <Icon icon={Globe} size="sm" />
                          Bank sign-in
                        </span>
                      ),
                    },
                  ]}
                  value={bankAuthType}
                  onValueChange={(value) => {
                    setBankAuthType(value as "token" | "oauth");
                    setBankError(null);
                  }}
                />

                {bankAuthType === "token" ? (
                  <FormField hint={bankTokenHint} label={bankTokenLabel}>
                    {(field) => (
                      <TextInput
                        {...controlProps(field)}
                        name="bankToken"
                        placeholder={bankTokenPlaceholder}
                        value={bankToken}
                        onChange={(e) => {
                          setBankToken(e.target.value);
                          setBankError(null);
                        }}
                      />
                    )}
                  </FormField>
                ) : (
                  <div className={noticeBox()}>
                    <p className={helperText()}>
                      &quot;Sign in at {selectedBankObj?.name}&quot; takes you to{" "}
                      {selectedBankObj?.name} to sign in.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className={noticeBox()}>
                <div className={noticeRow()}>
                  <Icon icon={TriangleAlert} size="sm" />
                  <div>
                    <p className={bankName()}>{selectedBankObj?.name} cannot be connected yet</p>
                    <p className={helperText()}>
                      Bank connection is a preview for Monzo and Starling only. You can add your{" "}
                      {selectedBankObj?.name} balances by hand.
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={onSwitchToManualForBank}>
                  Add {selectedBankObj?.name} by hand
                </Button>
              </div>
            )}

            {bankError && (
              <p className={saveError()} role="alert">
                <Icon icon={TriangleAlert} size="sm" />
                {bankError}
              </p>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
};

export default AddEditAccountsDialogBtn;
