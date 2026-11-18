import {
  type AccountOwnership,
  canAccountBeJoint,
  DEFAULT_JOINT_SHARE_PERCENT,
  describeJointLiabilityNotice,
  isBuyToLetAccount,
  isResidentialHomeAccount,
} from "@flump/finance-engine";
import {
  Button,
  CurrencyInput,
  controlProps,
  Dialog,
  FormField,
  Icon,
  PercentInput,
  Select,
  TextInput,
  useOptionalToast,
} from "@repo/ui";
import { Pencil } from "lucide-react";
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFetcher, useLoaderData } from "react-router";
import {
  type AccountType,
  AccountTypeEnum,
  isLiabilityType,
  STUDENT_LOAN_PLAN_OPTIONS,
} from "~/containers/accounts/utils";
import {
  INVESTMENT_SUBTYPE_OPTIONS,
  MORTGAGE_SUBTYPE_OPTIONS,
  SAVINGS_SUBTYPE_OPTIONS,
} from "~/features/accounts/accountSubtypes";
import { TYPE_LABEL } from "~/features/accounts/components/AccountsGroupList";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { HomeEquityLine } from "~/features/mortgage/components/HomeEquityLine";
import type { loader } from "~/routes/app.accounts._index";
import { versionField } from "~/services/conflict";
import {
  deleteAction,
  deleteConsequence,
  dialogFooterGroup,
  fieldStack,
  jointNotice,
  saveError,
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

/**
 * Liabilities are stored as minus the amount owed, but the form shows the positive amount owed,
 * as the rest of the app does. These two helpers convert between the stored and the shown figure.
 */
const toFormBalance = (type: AccountType | undefined, stored: number | undefined): string => {
  if (stored === undefined || stored === null) return "";
  return String(isLiabilityType(type) ? Math.abs(stored) : stored);
};

/** The figure to send: a liability goes back as minus the amount owed, which is what is stored. */
const toStoredBalance = (type: AccountType | undefined, shown: string): string => {
  if (shown === "" || !isLiabilityType(type)) return shown;
  const owed = Math.abs(Number(shown));
  return owed === 0 ? "0" : String(-owed);
};

/**
 * A fresh id for one opening of the dialog (the idempotency key's prefix). Always from the Web
 * Crypto random source: `randomUUID` where the page is a secure context, else 16 bytes from
 * `getRandomValues`, which works in any context.
 */
const newRequestId = (): string => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

export interface AccountOption {
  id?: string;
  name?: string;
  type?: AccountType;
  accountSubtype?: string | null;
  balance?: number;
  creditLimit?: number | null;
  promoZeroPercentUntil?: string | null;
  studentLoanPlan?: string | null;
  ownership?: AccountOwnership;
  sharePercent?: number | null;
  /** The saved account's version, sent with an edit so a change made elsewhere is not overwritten. */
  updatedAt?: string;
}

interface AddEditAccountsDialogBtnProp {
  accountId?: string;
  /**
   * The saved account to edit, as stored. Wins over the accounts list from the loader, which only
   * the accounts index route returns (the account detail route returns one account).
   */
  account?: AccountOption;
  isEditAccount?: boolean;
  btnSize?: "sm" | "md" | "lg" | "icon";
  isIconButton?: boolean;
  /** Style of the text button. The page's one primary action passes "primary" (E16 P7.4). */
  variant?: "primary" | "outline";
  /**
   * A link the text button follows before the page has hydrated (#701), for example
   * "/app/accounts?add=1"; the page then opens the dialog with `defaultOpen`. Once hydrated the
   * click opens the dialog in place.
   */
  fallbackHref?: string;
  /** Open on first render (the page was reached through `fallbackHref`). */
  defaultOpen?: boolean;
  /** Pre-selected type when opening in add mode (e.g. "Property" for "Add an estimate"). */
  initialType?: AccountType;
  /** Pre-filled name when opening in add mode (e.g. "Home (your estimate)"). */
  initialName?: string;
  /** Increment to programmatically open the add dialog (e.g. clicking "Add an estimate" while on /app/accounts). */
  openRequestKey?: number;
}

/**
 * Add or edit an account by hand. Bank connection is deferred (owner ruling), so the dialog is a
 * single manual form: it shows no bank tab or token form, whatever the bank connection flag says.
 * Delete never stacks a second modal (STYLE-GUIDE 12.3): the Edit dialog's content becomes the
 * confirmation (question, consequence, Cancel then "Delete {name}"), and Cancel goes back to the
 * form.
 */
const AddEditAccountsDialogBtn: FC<AddEditAccountsDialogBtnProp> = ({
  accountId,
  account,
  btnSize = "md",
  isEditAccount,
  isIconButton = false,
  variant = "outline",
  fallbackHref,
  defaultOpen = false,
  initialType,
  initialName,
  openRequestKey = 0,
}) => {
  const { accounts = [] }: { accounts?: AccountOption[] } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const [modalOpen, setModalOpen] = useState(defaultOpen);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  // Add a mortgage only: the home's value, sent as `homeValue` so the action adds the home too.
  const [homeValue, setHomeValue] = useState<number | null>(null);
  // A new id each time the dialog opens, sent with an add. The action keys its saves from it, so
  // pressing Save again after a timeout that did save replays the save instead of adding twice.
  const [requestId, setRequestId] = useState(newRequestId);
  const toastApi = useOptionalToast();
  const accountName = (account ?? accounts.find((option) => option.id === accountId))?.name;
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  // Focus follows the swap: Cancel when the question shows (Enter never deletes by accident), and
  // back to Delete when the form returns.
  const confirmShown = useRef(false);
  useEffect(() => {
    if (confirmDeleteOpen) {
      confirmShown.current = true;
      cancelDeleteRef.current?.focus();
    } else if (confirmShown.current) {
      confirmShown.current = false;
      deleteButtonRef.current?.focus();
    }
  }, [confirmDeleteOpen]);
  const editLabel = accountName ? `${t("editAccount")}: ${accountName}` : t("editAccount");

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setConfirmDeleteOpen(false);
  }, []);

  // A save that went through but left something out (the home value after a mortgage, say)
  // answers with a `notice`: the dialog closes, since what saved is kept, and the notice shows.
  const handleSaved = useCallback(() => {
    const notice = (fetcher.data as { notice?: unknown } | undefined)?.notice;
    if (typeof notice === "string" && notice !== "") toastApi?.toast({ title: notice });
    handleCloseModal();
  }, [fetcher.data, toastApi, handleCloseModal]);

  // Create, edit and delete keep the modal open until the action answers; only a success closes it.
  const saveOutcome = useFetcherOutcome(fetcher, { onSuccess: handleSaved });
  const deleteOutcome = useFetcherOutcome(fetcher, { onSuccess: handleCloseModal });
  const { dismiss: dismissSave } = saveOutcome;
  const { dismiss: dismissDelete } = deleteOutcome;

  const handleDismiss = useCallback(() => {
    handleCloseModal();
    dismissSave();
    dismissDelete();
  }, [handleCloseModal, dismissSave, dismissDelete]);

  const selectedAccount: AccountOption = useMemo(
    () => account ?? accounts?.find((option) => option.id === accountId),
    [account, accounts, accountId],
  ) ?? { name: "", type: accountTypeArray[0], balance: undefined, studentLoanPlan: null };

  const [formInput, setFormInput] = useState<{
    name: string;
    type: AccountType[];
    accountSubtype: string;
    /** The figure as shown: the positive amount owed for a liability. */
    balance: string;
    studentLoanPlan: string[];
    ownership: AccountOwnership;
    sharePercent: number | null;
    creditLimit: string;
    promoZeroPercentUntil: string;
  }>({
    name: isEditAccount ? selectedAccount.name || "" : (initialName ?? ""),
    type: [
      isEditAccount
        ? selectedAccount.type || accountTypeArray[0]
        : (initialType ?? accountTypeArray[0]),
    ],
    accountSubtype: isEditAccount ? selectedAccount.accountSubtype || "" : "",
    studentLoanPlan: [selectedAccount.studentLoanPlan || ""],
    balance: toFormBalance(selectedAccount.type, selectedAccount.balance),
    creditLimit:
      isEditAccount &&
      selectedAccount.creditLimit !== undefined &&
      selectedAccount.creditLimit !== null
        ? String(selectedAccount.creditLimit)
        : "",
    promoZeroPercentUntil: isEditAccount ? selectedAccount.promoZeroPercentUntil || "" : "",
    ownership: selectedAccount.ownership === "joint" ? "joint" : "sole",
    sharePercent: selectedAccount.sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT,
  });

  // The latest prefill, read when a new open request arrives. The effect is keyed on the request
  // alone, so a parent re-render with new props never reopens or resets the dialog.
  const reopenWith = useRef({
    isEditAccount,
    initialName,
    initialType,
    dismissSave,
    dismissDelete,
  });
  reopenWith.current = { isEditAccount, initialName, initialType, dismissSave, dismissDelete };
  useEffect(() => {
    const latest = reopenWith.current;
    if (openRequestKey > 0 && !latest.isEditAccount) {
      setPlanError(null);
      setHomeValue(null);
      setRequestId(newRequestId());
      latest.dismissSave();
      latest.dismissDelete();
      setFormInput({
        name: latest.initialName ?? "",
        type: [latest.initialType ?? accountTypeArray[0]],
        accountSubtype: "",
        studentLoanPlan: [""],
        balance: "",
        creditLimit: "",
        promoZeroPercentUntil: "",
        ownership: "sole",
        sharePercent: DEFAULT_JOINT_SHARE_PERCENT,
      });
      setModalOpen(true);
    }
  }, [openRequestKey]);

  const handleOpenModal = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setPlanError(null);
      setHomeValue(null);
      setRequestId(newRequestId());
      dismissSave();
      dismissDelete();
      setFormInput({
        name: isEditAccount ? selectedAccount.name || "" : (initialName ?? ""),
        type: [
          isEditAccount
            ? selectedAccount.type || accountTypeArray[0]
            : (initialType ?? accountTypeArray[0]),
        ],
        accountSubtype: isEditAccount ? selectedAccount.accountSubtype || "" : "",
        studentLoanPlan: [(isEditAccount && selectedAccount.studentLoanPlan) || ""],
        balance: isEditAccount ? toFormBalance(selectedAccount.type, selectedAccount.balance) : "",
        ownership: isEditAccount && selectedAccount.ownership === "joint" ? "joint" : "sole",
        sharePercent:
          isEditAccount && selectedAccount.sharePercent != null
            ? selectedAccount.sharePercent
            : DEFAULT_JOINT_SHARE_PERCENT,
        creditLimit:
          isEditAccount &&
          selectedAccount.creditLimit !== undefined &&
          selectedAccount.creditLimit !== null
            ? String(selectedAccount.creditLimit)
            : "",
        promoZeroPercentUntil: isEditAccount ? selectedAccount.promoZeroPercentUntil || "" : "",
      });
      setModalOpen(true);
    },
    [isEditAccount, selectedAccount, initialName, initialType, dismissSave, dismissDelete],
  );

  const onChangeNameInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormInput((prevState) => ({ ...prevState, name: value }));
  }, []);

  const onChangeBalanceInput = useCallback((value: number | null) => {
    setFormInput((prevState) => ({ ...prevState, balance: value === null ? "" : String(value) }));
  }, []);

  const onChangeTypeInput = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormInput((prevState) => ({
      ...prevState,
      type: [e.target.value] as AccountType[],
      accountSubtype: "",
    }));
  }, []);

  const onChangeSubtypeInput = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormInput((prevState) => ({ ...prevState, accountSubtype: e.target.value }));
  }, []);

  const onChangeCreditLimitInput = useCallback((value: number | null) => {
    setFormInput((prevState) => ({
      ...prevState,
      creditLimit: value === null ? "" : String(value),
    }));
  }, []);

  const onChangePromoDateInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormInput((prevState) => ({ ...prevState, promoZeroPercentUntil: e.target.value }));
  }, []);

  const onChangePlanInput = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlanError(null);
    setFormInput((prevState) => ({ ...prevState, studentLoanPlan: [e.target.value] }));
  }, []);

  const onChangeOwnershipInput = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextOwnership: AccountOwnership = e.target.value === "joint" ? "joint" : "sole";
    setFormInput((prevState) => ({
      ...prevState,
      ownership: nextOwnership,
      sharePercent:
        nextOwnership === "joint"
          ? (prevState.sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT)
          : prevState.sharePercent,
    }));
  }, []);

  const onChangeSharePercentInput = useCallback((value: number | null) => {
    setFormInput((prevState) => ({ ...prevState, sharePercent: value }));
  }, []);

  const jointEligible = canAccountBeJoint({
    name: formInput.name,
    type: formInput.type?.[0],
    accountSubtype: formInput.accountSubtype || null,
  });
  const effectiveOwnership: AccountOwnership =
    jointEligible && formInput.ownership === "joint" ? "joint" : "sole";
  const resolvedShare =
    effectiveOwnership === "joint"
      ? Math.min(
          100,
          Math.max(1, Math.round(formInput.sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT)),
        )
      : null;

  // Adding a residential mortgage asks for the home's value too, unless a home is already on
  // Accounts. Not for buy to let: the mortgage page keeps that value on the profile.
  const addingMortgage = !isEditAccount && formInput.type?.[0] === MORTGAGE;
  const mortgageIsBtl = isBuyToLetAccount({
    name: formInput.name,
    accountSubtype: formInput.accountSubtype || null,
  });
  // The same check the action makes before it adds the home (one rule, in the engine).
  const hasHome = accounts.some(isResidentialHomeAccount);
  const showHomeValue = addingMortgage && !mortgageIsBtl && !hasHome;
  // The typed balance for the equity line; empty, not a number or below 0 counts as none.
  const typedOwed = formInput.balance === "" ? null : Number(formInput.balance);
  const equityOwed =
    typedOwed !== null && Number.isFinite(typedOwed) && typedOwed >= 0 ? typedOwed : null;

  const onSave = useCallback(() => {
    const {
      name,
      type,
      accountSubtype,
      balance,
      studentLoanPlan,
      creditLimit,
      promoZeroPercentUntil,
    } = formInput;
    const accountType = type?.[0];
    if (accountType === STUDENT_LOAN && !studentLoanPlan[0]) {
      setPlanError(PLAN_REQUIRED_MESSAGE);
      return;
    }
    const stored = toStoredBalance(accountType, balance);
    const supportsSubtype =
      accountType === SAVING || accountType === INVESTMENT || accountType === MORTGAGE;
    const supportsCreditFields = accountType === CREDIT_CARD || accountType === OVERDRAFT;
    saveOutcome.begin();
    fetcher.submit(
      {
        ...(isEditAccount
          ? {
              intent: "update",
              accountId: accountId || "",
              ...versionField(account ?? accounts.find((option) => option.id === accountId)),
            }
          : { intent: "create", requestId }),
        name,
        type: accountType || "",
        ownership: effectiveOwnership,
        ...(resolvedShare !== null ? { sharePercent: String(resolvedShare) } : {}),
        ...(supportsSubtype ? { accountSubtype } : isEditAccount ? { accountSubtype: "" } : {}),
        ...(accountType === STUDENT_LOAN ? { studentLoanPlan: studentLoanPlan[0] ?? "" } : {}),
        ...(stored !== "" ? { balance: stored } : {}),
        ...(supportsCreditFields
          ? { creditLimit, promoZeroPercentUntil }
          : isEditAccount
            ? { creditLimit: "", promoZeroPercentUntil: "" }
            : {}),
        ...(showHomeValue && homeValue !== null && homeValue > 0
          ? { homeValue: String(homeValue) }
          : {}),
      },
      { method: "POST" },
    );
  }, [
    accountId,
    account,
    accounts,
    effectiveOwnership,
    resolvedShare,
    showHomeValue,
    homeValue,
    isEditAccount,
    formInput,
    fetcher,
    requestId,
    saveOutcome.begin,
  ]);

  const handleConfirmRemoveAccount = useCallback(() => {
    deleteOutcome.begin();
    fetcher.submit(
      {
        intent: "delete",
        accountId: accountId || "",
      },
      { method: "POST" },
    );
  }, [accountId, fetcher, deleteOutcome.begin]);

  const cancelDelete = useCallback(() => {
    if (deleteOutcome.pending) return;
    setConfirmDeleteOpen(false);
    dismissDelete();
  }, [deleteOutcome.pending, dismissDelete]);

  const isConfirmDisabled = saveOutcome.pending || deleteOutcome.pending;
  const deleteName = selectedAccount.name || "this account";
  const confirming = Boolean(isEditAccount && confirmDeleteOpen);
  const isLiability = isLiabilityType(formInput.type?.[0]);
  const jointLiabilityNotice = describeJointLiabilityNotice({
    type: formInput.type?.[0],
    ownership: effectiveOwnership,
  });
  // A saved joint account edited into an ISA or pension is saved as sole: say so (E34).
  const becomesSole = isEditAccount && selectedAccount.ownership === "joint" && !jointEligible;

  return (
    <>
      {isIconButton ? (
        <Button aria-label={editLabel} size="icon" variant="ghost" onClick={handleOpenModal}>
          <Icon icon={Pencil} size="sm" />
        </Button>
      ) : fallbackHref ? (
        // A real link, so a click before hydration still reaches the add flow (#701).
        <Button asChild size={btnSize === "icon" ? "md" : btnSize} variant={variant}>
          <a
            data-testid="add-account-link"
            href={fallbackHref}
            id="add-account-link"
            onClick={(e) => {
              e.preventDefault();
              handleOpenModal(e);
            }}
          >
            {t(isEditAccount ? "edit" : "addAccount")}
          </a>
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
          confirming ? (
            <div className={dialogFooterGroup()}>
              <Button
                disabled={deleteOutcome.pending}
                data-testid="account-delete-cancel"
                id="account-delete-cancel"
                onClick={cancelDelete}
                ref={cancelDeleteRef}
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                aria-busy={deleteOutcome.pending || undefined}
                disabled={deleteOutcome.pending}
                data-testid="account-delete-confirm"
                id="account-delete-confirm"
                onClick={handleConfirmRemoveAccount}
                type="button"
                variant="destructive"
              >
                {`Delete ${deleteName}`}
              </Button>
            </div>
          ) : (
            <>
              {isEditAccount ? (
                <Button
                  className={deleteAction()}
                  ref={deleteButtonRef}
                  type="button"
                  variant="ghost"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    dismissDelete();
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
                <Button disabled={isConfirmDisabled} type="button" onClick={onSave}>
                  {isEditAccount ? t("save") : t("addAccount")}
                </Button>
              </div>
            </>
          )
        }
        id="account-dialog"
        open={modalOpen}
        title={
          confirming ? `Delete ${deleteName}?` : t(isEditAccount ? "editAccount" : "addAccount")
        }
        onOpenChange={(open) => {
          if (open) return;
          // Escape or Close on the question goes back to the form; on the form it closes.
          if (confirming) cancelDelete();
          else handleDismiss();
        }}
      >
        {confirming ? (
          <>
            <p className={deleteConsequence()}>
              Its balance history will be deleted too. This cannot be undone.
            </p>
            {deleteOutcome.error ? (
              <p role="alert" className={saveError()}>
                {deleteOutcome.error}
              </p>
            ) : null}
          </>
        ) : (
          <form className={fieldStack()} id={accountId} onSubmit={(e) => e.preventDefault()}>
            <FormField label="Name">
              {(field) => (
                <TextInput
                  {...controlProps(field)}
                  name="name"
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
                  options={accountTypeArray.map((type) => ({
                    value: type,
                    label: TYPE_LABEL[type] ?? type,
                  }))}
                  value={formInput.type?.[0] ?? ""}
                  onChange={onChangeTypeInput}
                />
              )}
            </FormField>
            {formInput.type?.[0] === SAVING ||
            formInput.type?.[0] === INVESTMENT ||
            formInput.type?.[0] === MORTGAGE ? (
              <FormField
                label={
                  formInput.type?.[0] === MORTGAGE
                    ? "Kind of mortgage (optional)"
                    : "Kind of account (optional)"
                }
              >
                {(field) => {
                  const subtypeOptions =
                    formInput.type?.[0] === MORTGAGE
                      ? MORTGAGE_SUBTYPE_OPTIONS
                      : formInput.type?.[0] === INVESTMENT
                        ? INVESTMENT_SUBTYPE_OPTIONS
                        : SAVINGS_SUBTYPE_OPTIONS;
                  return (
                    <Select
                      {...controlProps(field)}
                      name="accountSubtype"
                      options={[
                        { value: "", label: "Not set" },
                        ...subtypeOptions.map((o) => ({ value: o.value, label: o.label })),
                      ]}
                      value={formInput.accountSubtype}
                      onChange={onChangeSubtypeInput}
                    />
                  );
                }}
              </FormField>
            ) : null}
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
            <FormField label={isLiability ? "Amount owed" : "Balance"}>
              {(field) => (
                <CurrencyInput
                  {...controlProps(field)}
                  min={isLiability ? 0 : undefined}
                  name="balance"
                  value={formInput.balance === "" ? null : Number(formInput.balance)}
                  onValueChange={onChangeBalanceInput}
                />
              )}
            </FormField>
            {jointEligible ? (
              <>
                <FormField label="Ownership">
                  {(field) => (
                    <Select
                      {...controlProps(field)}
                      name="ownership"
                      options={[
                        { value: "sole", label: "Sole (yours only)" },
                        { value: "joint", label: "Joint" },
                      ]}
                      value={formInput.ownership}
                      onChange={onChangeOwnershipInput}
                    />
                  )}
                </FormField>
                {effectiveOwnership === "joint" ? (
                  <FormField label="Your share">
                    {(field) => (
                      <PercentInput
                        {...controlProps(field)}
                        max={100}
                        min={1}
                        name="sharePercent"
                        value={formInput.sharePercent}
                        onValueChange={onChangeSharePercentInput}
                      />
                    )}
                  </FormField>
                ) : null}
                {jointLiabilityNotice ? (
                  <p className={jointNotice()} role="note">
                    {jointLiabilityNotice}
                  </p>
                ) : null}
              </>
            ) : becomesSole ? (
              <p className={jointNotice()} role="note">
                An ISA or pension is held in one name, so this account will be saved as sole.
              </p>
            ) : null}
            {showHomeValue ? (
              <>
                <FormField
                  hint="Your own estimate. We add it as your home, so you do not need a separate property account."
                  label="What your home is worth (optional)"
                >
                  {(field) => (
                    <CurrencyInput
                      {...controlProps(field)}
                      min={0}
                      name="homeValue"
                      value={homeValue}
                      onValueChange={setHomeValue}
                    />
                  )}
                </FormField>
                {/* The home is added at the mortgage's share, so both sides use it. */}
                <HomeEquityLine
                  homeSharePercent={resolvedShare}
                  homeValue={homeValue}
                  mortgageBalance={equityOwed}
                  mortgageSharePercent={resolvedShare}
                />
              </>
            ) : null}
            {formInput.type?.[0] === CREDIT_CARD || formInput.type?.[0] === OVERDRAFT ? (
              <>
                <FormField
                  hint="Your card or overdraft limit, even if the balance is £0."
                  label="Credit limit (optional)"
                >
                  {(field) => (
                    <CurrencyInput
                      {...controlProps(field)}
                      min={0}
                      name="creditLimit"
                      value={formInput.creditLimit === "" ? null : Number(formInput.creditLimit)}
                      onValueChange={onChangeCreditLimitInput}
                    />
                  )}
                </FormField>
                <FormField
                  hint="When any 0% promotional interest period ends."
                  label="0% interest period ends (optional)"
                >
                  {(field) => (
                    <TextInput
                      {...controlProps(field)}
                      name="promoZeroPercentUntil"
                      type="date"
                      value={formInput.promoZeroPercentUntil}
                      onChange={onChangePromoDateInput}
                    />
                  )}
                </FormField>
              </>
            ) : null}
            {saveOutcome.error ? (
              <p role="alert" className={saveError()}>
                {saveOutcome.error}
              </p>
            ) : null}
          </form>
        )}
      </Dialog>
    </>
  );
};

export default AddEditAccountsDialogBtn;
