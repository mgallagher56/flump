import {
  type AccountOwnership,
  DEFAULT_JOINT_SHARE_PERCENT,
  describeJointLiabilityNotice,
  describeJointWholeValue,
  isBuyToLetAccount,
  typeChangeFlipsSign,
} from "@flump/finance-engine";
import {
  Button,
  CurrencyInput,
  controlProps,
  DatePicker,
  Dialog,
  FormField,
  Icon,
  InfoTip,
  PercentInput,
  Select,
  TextInput,
  useOptionalToast,
  WholeNumberInput,
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
import { accountFieldSet, changedFields } from "~/features/accounts/accountFieldSet";
import { MORTGAGE_REPAYMENT_OPTIONS } from "~/features/accounts/accountSubtypes";
import { TYPE_LABEL } from "~/features/accounts/components/AccountsGroupList";
import {
  JointOwnershipFields,
  resolveSharePercent,
} from "~/features/accounts/components/JointOwnershipFields";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { HomeEquityLine } from "~/features/mortgage/components/HomeEquityLine";
import type { loader } from "~/routes/app.accounts._index";
import { versionField } from "~/services/conflict";
import {
  deleteConsequence,
  dialogFooterGroup,
  fieldPair,
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
/** Shown before saving a type change that turns a debt into something you own (CH-4). */
export const TYPE_FLIPS_SIGN_NOTE =
  "This turns the debt into something you own, so net worth this month and in every past month rises by twice its balance.";

/** The link select's "no property" choice. */
export const NOT_LINKED_LABEL = "Not linked";

/** Hidden copy of the property value's info text, named in that field's aria-describedby. */
const HOME_VALUE_NOTE_ID = "account-home-value-note";

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

const numberText = (value: number | null | undefined): string =>
  value === undefined || value === null || !Number.isFinite(Number(value)) ? "" : String(value);

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
  interestRate?: number | null;
  monthlyContribution?: number | null;
  creditLimit?: number | null;
  promoZeroPercentUntil?: string | null;
  studentLoanPlan?: string | null;
  termMonths?: number | null;
  fixedRateEndDate?: string | null;
  repaymentType?: string | null;
  linkedAccountId?: string | null;
  ownership?: AccountOwnership | string | null;
  sharePercent?: number | null;
  /** The saved account's version, sent with an edit so a change made elsewhere is not overwritten. */
  updatedAt?: string;
}

/** A mortgage the new property is for: after the property saves, the action links them. */
export interface LinkMortgageTarget {
  id: string;
  /** The mortgage's version, so the link never overwrites a change made elsewhere. */
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
  /** Pre-selected kind when opening in add mode (e.g. "home" or "rental" for a property). */
  initialSubtype?: string;
  /** Suggested ownership and share in add mode (a mortgage's, for its property: decision 14 B). */
  initialOwnership?: AccountOwnership;
  initialSharePercent?: number | null;
  /** Add mode: the mortgage to link the new property to once it is saved (JO-6). */
  linkMortgage?: LinkMortgageTarget;
  /** Increment to programmatically open the add dialog (e.g. clicking "Add an estimate" while on /app/accounts). */
  openRequestKey?: number;
}

/** Every field the form holds, as typed. The balance is the shown figure (owed, for a debt). */
interface FormState {
  name: string;
  type: AccountType;
  accountSubtype: string;
  balance: string;
  interestRate: string;
  monthlyContribution: string;
  studentLoanPlan: string;
  creditLimit: string;
  promoZeroPercentUntil: string;
  termYears: string;
  termExtraMonths: string;
  fixedRateEndDate: string;
  repaymentType: string;
  linkedAccountId: string;
  ownership: AccountOwnership;
  sharePercent: number | null;
}

interface Prefill {
  initialName?: string;
  initialType?: AccountType;
  initialSubtype?: string;
  initialOwnership?: AccountOwnership;
  initialSharePercent?: number | null;
}

const termParts = (months: number | null | undefined): [string, string] => {
  if (months === undefined || months === null || !Number.isFinite(Number(months))) return ["", ""];
  const whole = Math.round(Number(months));
  return [String(Math.floor(whole / 12)), String(whole % 12)];
};

const savedState = (account: AccountOption): FormState => {
  const [termYears, termExtraMonths] = termParts(account.termMonths);
  return {
    name: account.name || "",
    type: account.type || accountTypeArray[0],
    accountSubtype: account.accountSubtype || "",
    balance: toFormBalance(account.type, account.balance),
    interestRate: numberText(account.interestRate),
    monthlyContribution: numberText(account.monthlyContribution),
    studentLoanPlan: account.studentLoanPlan || "",
    creditLimit: numberText(account.creditLimit),
    promoZeroPercentUntil: account.promoZeroPercentUntil || "",
    termYears,
    termExtraMonths,
    fixedRateEndDate: account.fixedRateEndDate || "",
    repaymentType: account.repaymentType || "",
    linkedAccountId: account.linkedAccountId || "",
    ownership: account.ownership === "joint" ? "joint" : "sole",
    sharePercent: account.sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT,
  };
};

const newState = (prefill: Prefill): FormState => ({
  name: prefill.initialName ?? "",
  type: prefill.initialType ?? accountTypeArray[0],
  accountSubtype: prefill.initialSubtype ?? "",
  balance: "",
  interestRate: "",
  monthlyContribution: "",
  studentLoanPlan: "",
  creditLimit: "",
  promoZeroPercentUntil: "",
  termYears: "",
  termExtraMonths: "",
  fixedRateEndDate: "",
  repaymentType: "",
  linkedAccountId: "",
  ownership: prefill.initialOwnership === "joint" ? "joint" : "sole",
  sharePercent: prefill.initialSharePercent ?? DEFAULT_JOINT_SHARE_PERCENT,
});

/** Whole months from the typed years and months, or "" when neither is typed or it is 0. */
const termMonthsText = (years: string, months: string): string => {
  if (years === "" && months === "") return "";
  const total = Number(years || 0) * 12 + Number(months || 0);
  return Number.isFinite(total) && total > 0 ? String(Math.round(total)) : "";
};

/**
 * The values the form would post, by field. A field the account's type does not show is empty, so
 * an edit that changes the type clears what the new type does not take. The balance is the shown
 * figure here; it is converted to the stored one only when it is sent.
 */
const formValues = (state: FormState): Record<string, string> => {
  const set = accountFieldSet({
    type: state.type,
    name: state.name,
    accountSubtype: state.accountSubtype,
  });
  const ownership: AccountOwnership = set.joint && state.ownership === "joint" ? "joint" : "sole";
  const share = resolveSharePercent(ownership, state.sharePercent);
  return {
    name: state.name,
    type: state.type,
    accountSubtype: set.kind ? state.accountSubtype : "",
    balance: state.balance,
    interestRate: set.interestRate ? state.interestRate : "",
    monthlyContribution: set.monthlyContribution ? state.monthlyContribution : "",
    studentLoanPlan: set.studentLoanPlan ? state.studentLoanPlan : "",
    creditLimit: set.creditFields ? state.creditLimit : "",
    promoZeroPercentUntil: set.creditFields ? state.promoZeroPercentUntil : "",
    termMonths: set.mortgageFields ? termMonthsText(state.termYears, state.termExtraMonths) : "",
    fixedRateEndDate: set.mortgageFields ? state.fixedRateEndDate : "",
    repaymentType: set.mortgageFields ? state.repaymentType : "",
    linkedAccountId: set.mortgageFields ? state.linkedAccountId : "",
    ownership,
    sharePercent: share === null ? "" : String(share),
  };
};

/**
 * Add or edit an account by hand. Bank connection is deferred (owner ruling), so the dialog is a
 * single manual form: it shows no bank tab or token form, whatever the bank connection flag says.
 * The fields follow the account type's field set (`accountFieldSet`), the same set the Savings,
 * Debt and Pension dialogs show. An edit sends only the fields the user changed.
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
  initialSubtype,
  initialOwnership,
  initialSharePercent,
  linkMortgage,
  openRequestKey = 0,
}) => {
  const { accounts = [] }: { accounts?: AccountOption[] } = useLoaderData<typeof loader>() ?? {};
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const [modalOpen, setModalOpen] = useState(defaultOpen);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  // Add a mortgage only: the property's value, sent as `homeValue` so the action adds the
  // property too, linked to the mortgage.
  const [homeValue, setHomeValue] = useState<number | null>(null);
  // Add a mortgage only: whether the user chose from the link select (else one match preselects).
  const [linkTouched, setLinkTouched] = useState(false);
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

  // A save that went through but left something out (the link to a mortgage, say) answers with a
  // `notice`: the dialog closes, since what saved is kept, and the notice shows.
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

  const prefill: Prefill = {
    initialName,
    initialType,
    initialSubtype,
    initialOwnership,
    initialSharePercent,
  };
  const [formInput, setFormInput] = useState<FormState>(() =>
    isEditAccount ? savedState(selectedAccount) : newState(prefill),
  );
  // What the form opened with, so an edit sends only what the user changed (CH-3, slice 4): a
  // re-posted balance writes a current-month history row, which counts as a recorded month.
  const [opened, setOpened] = useState<FormState>(formInput);

  const resetForOpen = useCallback(
    (state: FormState) => {
      setPlanError(null);
      setHomeValue(null);
      setLinkTouched(false);
      setRequestId(newRequestId());
      dismissSave();
      dismissDelete();
      setOpened(state);
      setFormInput(state);
      setModalOpen(true);
    },
    [dismissSave, dismissDelete],
  );

  // The latest prefill, read when a new open request arrives. The effect is keyed on the request
  // alone, so a parent re-render with new props never reopens or resets the dialog.
  const reopenWith = useRef({ isEditAccount, prefill, resetForOpen });
  reopenWith.current = { isEditAccount, prefill, resetForOpen };
  useEffect(() => {
    const latest = reopenWith.current;
    if (openRequestKey > 0 && !latest.isEditAccount) {
      latest.resetForOpen(newState(latest.prefill));
    }
  }, [openRequestKey]);

  const handleOpenModal = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    resetForOpen(isEditAccount ? savedState(selectedAccount) : newState(prefill));
  };

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormInput((prev) => ({ ...prev, [key]: value }));
  }, []);
  const asText = (value: number | null): string => (value === null ? "" : String(value));

  const accountType = formInput.type;
  const fieldSet = accountFieldSet({
    type: accountType,
    name: formInput.name,
    accountSubtype: formInput.accountSubtype,
  });
  const values = formValues(formInput);
  const effectiveOwnership = values.ownership as AccountOwnership;
  const resolvedShare = values.sharePercent === "" ? null : Number(values.sharePercent);

  // A mortgage is on a home or, for buy to let, a rental: the saved kind decides, else the name.
  const mortgageIsBtl = isBuyToLetAccount({
    name: formInput.name,
    accountSubtype: formInput.accountSubtype || null,
  });
  const wantedKind = mortgageIsBtl ? "rental" : "home";
  // The properties this mortgage can be on: those of the matching kind, and those with no kind
  // saved. The one it is linked to now is always listed, so the select shows it.
  const linkableProperties = fieldSet.mortgageFields
    ? accounts.filter(
        (a) =>
          a.type === PROPERTY &&
          a.id &&
          (!a.accountSubtype ||
            a.accountSubtype === wantedKind ||
            a.id === selectedAccount.linkedAccountId),
      )
    : [];
  const addingMortgage = !isEditAccount && fieldSet.mortgageFields;
  // Adding a mortgage with no property to link to asks for the property's value instead, and the
  // action adds the property and the mortgage together, linked.
  const showHomeValue = addingMortgage && linkableProperties.length === 0;
  const showLinkSelect = fieldSet.mortgageFields && linkableProperties.length > 0;
  // One property to link to is preselected when adding, until the user chooses.
  const linkedAccountId =
    addingMortgage && !linkTouched && linkableProperties.length === 1
      ? (linkableProperties[0]?.id ?? "")
      : values.linkedAccountId;
  // The typed balance for the equity line; empty, not a number or below 0 counts as none.
  const typedOwed = formInput.balance === "" ? null : Number(formInput.balance);
  const equityOwed =
    typedOwed !== null && Number.isFinite(typedOwed) && typedOwed >= 0 ? typedOwed : null;

  const onSave = () => {
    if (fieldSet.studentLoanPlan && !formInput.studentLoanPlan) {
      setPlanError(PLAN_REQUIRED_MESSAGE);
      return;
    }
    const current: Record<string, string> = { ...values, linkedAccountId };
    // An edit sends what changed; an add sends the fields its type shows.
    const toSend: Record<string, string> = isEditAccount
      ? changedFields(formValues(opened), current)
      : Object.fromEntries(
          Object.entries(current).filter(
            ([key, value]) =>
              key === "name" ||
              key === "type" ||
              key === "ownership" ||
              (key === "accountSubtype" && fieldSet.kind !== null) ||
              (key === "creditLimit" && fieldSet.creditFields) ||
              (key === "promoZeroPercentUntil" && fieldSet.creditFields) ||
              (key === "studentLoanPlan" && fieldSet.studentLoanPlan) ||
              value !== "",
          ),
        );
    // An edit sends the share with the ownership, so a share is never left behind on a sole one.
    if (isEditAccount && "ownership" in toSend && current.sharePercent !== "") {
      toSend.sharePercent = current.sharePercent;
    }
    // The balance is compared as shown and sent as stored (minus the amount owed for a debt).
    if ("balance" in toSend) {
      const stored = toStoredBalance(accountType, toSend.balance ?? "");
      if (stored === "") delete toSend.balance;
      else toSend.balance = stored;
    }
    // A sole account sends no share: the action clears it with the ownership.
    if (toSend.sharePercent === "") delete toSend.sharePercent;
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
        ...toSend,
        ...(showHomeValue && homeValue !== null && homeValue > 0
          ? { homeValue: String(homeValue) }
          : {}),
        ...(!isEditAccount && linkMortgage && accountType === PROPERTY
          ? {
              linkMortgageId: linkMortgage.id,
              ...versionField(linkMortgage, "linkMortgageVersion"),
            }
          : {}),
      },
      { method: "POST" },
    );
  };

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
  const isLiability = isLiabilityType(accountType);
  const jointLiabilityNotice = describeJointLiabilityNotice({
    type: accountType,
    ownership: effectiveOwnership,
  });
  // A joint account's balance field holds the whole balance, and says so (decision 9 A).
  const wholeBalanceHint = describeJointWholeValue(
    { type: accountType, ownership: effectiveOwnership, sharePercent: resolvedShare },
    isLiability ? "amount owed" : "balance",
  );
  // A debt changed to a type that cannot be overdrawn turns positive, past months too (CH-4).
  const typeFlipsSign = isEditAccount && typeChangeFlipsSign(selectedAccount.type, accountType);
  // A saved joint account edited into an ISA or pension is saved as sole: say so (E34).
  const becomesSole = isEditAccount && selectedAccount.ownership === "joint" && !fieldSet.joint;
  const propertyIsRental = wantedKind === "rental";

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
                // Delete as a quiet destructive action (the shared subtle danger button). It opens
                // the confirmation; it never deletes itself.
                <Button
                  ref={deleteButtonRef}
                  type="button"
                  variant="dangerSubtle"
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
                  onChange={(e) => update("name", e.target.value)}
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
                  value={accountType ?? ""}
                  onChange={(e) =>
                    setFormInput((prev) => ({
                      ...prev,
                      type: e.target.value as AccountType,
                      accountSubtype: "",
                    }))
                  }
                />
              )}
            </FormField>
            {typeFlipsSign ? (
              <p className={jointNotice()} data-testid="type-flips-sign-note" role="note">
                {TYPE_FLIPS_SIGN_NOTE}
              </p>
            ) : null}
            {fieldSet.kind ? (
              <FormField label={fieldSet.kind.label}>
                {(field) => (
                  <Select
                    {...controlProps(field)}
                    name="accountSubtype"
                    options={[
                      { value: "", label: "Not set" },
                      ...(fieldSet.kind?.options ?? []).map((o) => ({
                        value: o.value,
                        label: o.label,
                      })),
                    ]}
                    value={formInput.accountSubtype}
                    onChange={(e) => update("accountSubtype", e.target.value)}
                  />
                )}
              </FormField>
            ) : null}
            {fieldSet.studentLoanPlan ? (
              <FormField error={planError ?? undefined} label="Repayment plan">
                {(field) => (
                  <Select
                    {...controlProps(field)}
                    name="studentLoanPlan"
                    options={studentLoanPlans.items.map((plan) => ({
                      value: plan.id,
                      label: plan.name,
                    }))}
                    value={formInput.studentLoanPlan}
                    onChange={(e) => {
                      setPlanError(null);
                      update("studentLoanPlan", e.target.value);
                    }}
                  />
                )}
              </FormField>
            ) : null}
            <FormField
              hint={wholeBalanceHint ?? undefined}
              label={isLiability ? "Amount owed" : "Balance"}
            >
              {(field) => (
                <CurrencyInput
                  {...controlProps(field)}
                  min={isLiability ? 0 : undefined}
                  name="balance"
                  value={formInput.balance === "" ? null : Number(formInput.balance)}
                  onValueChange={(v) => update("balance", asText(v))}
                />
              )}
            </FormField>
            {fieldSet.interestRate ? (
              <FormField label={fieldSet.interestRate.label}>
                {(field) => (
                  <PercentInput
                    {...controlProps(field)}
                    max={100}
                    min={0}
                    name="interestRate"
                    value={formInput.interestRate === "" ? null : Number(formInput.interestRate)}
                    onValueChange={(v) => update("interestRate", asText(v))}
                  />
                )}
              </FormField>
            ) : null}
            {fieldSet.monthlyContribution ? (
              <FormField label={fieldSet.monthlyContribution.label}>
                {(field) => (
                  <CurrencyInput
                    {...controlProps(field)}
                    min={0}
                    name="monthlyContribution"
                    value={
                      formInput.monthlyContribution === ""
                        ? null
                        : Number(formInput.monthlyContribution)
                    }
                    onValueChange={(v) => update("monthlyContribution", asText(v))}
                  />
                )}
              </FormField>
            ) : null}
            {fieldSet.joint ? (
              <>
                <JointOwnershipFields
                  ownership={formInput.ownership}
                  sharePercent={formInput.sharePercent}
                  onOwnershipChange={(next) =>
                    setFormInput((prev) => ({
                      ...prev,
                      ownership: next,
                      sharePercent: prev.sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT,
                    }))
                  }
                  onSharePercentChange={(v) => update("sharePercent", v)}
                />
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
            {fieldSet.mortgageFields ? (
              <>
                <FormField label="How it is repaid (optional)">
                  {(field) => (
                    <Select
                      {...controlProps(field)}
                      name="repaymentType"
                      options={[{ value: "", label: "Not set" }, ...MORTGAGE_REPAYMENT_OPTIONS]}
                      value={formInput.repaymentType}
                      onChange={(e) => update("repaymentType", e.target.value)}
                    />
                  )}
                </FormField>
                <div className={fieldPair()}>
                  <FormField label="Years left (optional)">
                    {(field) => (
                      <WholeNumberInput
                        {...controlProps(field)}
                        max={50}
                        min={0}
                        name="termYears"
                        value={formInput.termYears === "" ? null : Number(formInput.termYears)}
                        onValueChange={(v) => update("termYears", asText(v))}
                      />
                    )}
                  </FormField>
                  <FormField label="Months">
                    {(field) => (
                      <WholeNumberInput
                        {...controlProps(field)}
                        max={11}
                        min={0}
                        name="termExtraMonths"
                        value={
                          formInput.termExtraMonths === ""
                            ? null
                            : Number(formInput.termExtraMonths)
                        }
                        onValueChange={(v) => update("termExtraMonths", asText(v))}
                      />
                    )}
                  </FormField>
                </div>
                <FormField label="Fixed rate ends (optional)">
                  {(field) => (
                    <DatePicker
                      {...controlProps(field)}
                      clearable
                      name="fixedRateEndDate"
                      value={formInput.fixedRateEndDate}
                      onValueChange={(v) => update("fixedRateEndDate", v)}
                    />
                  )}
                </FormField>
                {showLinkSelect ? (
                  <FormField label="Which property is this mortgage on">
                    {(field) => (
                      <Select
                        {...controlProps(field)}
                        name="linkedAccountId"
                        options={[
                          { value: "", label: NOT_LINKED_LABEL },
                          ...linkableProperties.map((p) => ({
                            value: p.id ?? "",
                            label: p.name || "Property",
                          })),
                        ]}
                        value={linkedAccountId}
                        onChange={(e) => {
                          setLinkTouched(true);
                          update("linkedAccountId", e.target.value);
                        }}
                      />
                    )}
                  </FormField>
                ) : null}
              </>
            ) : null}
            {showHomeValue ? (
              <>
                <FormField
                  label={
                    propertyIsRental
                      ? "What the property is worth (optional)"
                      : "What your home is worth (optional)"
                  }
                  labelAddon={
                    <InfoTip
                      descriptionId={HOME_VALUE_NOTE_ID}
                      label={
                        propertyIsRental ? "About the property value" : "About your home value"
                      }
                      term={propertyIsRental ? "Property value" : "Home value"}
                    >
                      {propertyIsRental
                        ? "Your own estimate. We add it as a rental property, linked to this mortgage."
                        : "Your own estimate. We add it as your home, so you do not need a separate property account."}
                    </InfoTip>
                  }
                >
                  {(field) => (
                    <CurrencyInput
                      {...controlProps({
                        ...field,
                        describedBy: [field.describedBy, HOME_VALUE_NOTE_ID]
                          .filter(Boolean)
                          .join(" "),
                      })}
                      min={0}
                      name="homeValue"
                      value={homeValue}
                      onValueChange={setHomeValue}
                    />
                  )}
                </FormField>
                {/* The property is added at the mortgage's share, so both sides use it. */}
                {propertyIsRental ? null : (
                  <HomeEquityLine
                    homeSharePercent={resolvedShare}
                    homeValue={homeValue}
                    mortgageBalance={equityOwed}
                    mortgageSharePercent={resolvedShare}
                  />
                )}
              </>
            ) : null}
            {fieldSet.creditFields ? (
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
                      onValueChange={(v) => update("creditLimit", asText(v))}
                    />
                  )}
                </FormField>
                <FormField
                  hint="When any 0% promotional interest period ends."
                  label="0% interest period ends (optional)"
                >
                  {(field) => (
                    <DatePicker
                      {...controlProps(field)}
                      clearable
                      name="promoZeroPercentUntil"
                      value={formInput.promoZeroPercentUntil}
                      onValueChange={(v) => update("promoZeroPercentUntil", v)}
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
