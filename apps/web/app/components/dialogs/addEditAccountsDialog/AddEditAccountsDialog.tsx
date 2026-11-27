import {
  ACCOUNT_FORM_TYPES,
  type AccountFormPrefill,
  type AccountFormState,
  type AccountOwnership,
  accountFieldSet,
  accountFormFromSaved,
  accountFormNeedsPlan,
  accountFormToSend,
  accountFormValues,
  DEFAULT_JOINT_SHARE_PERCENT,
  describeJointLiabilityNotice,
  describeJointWholeValue,
  MORTGAGE_REPAYMENT_OPTIONS,
  mortgageLinkChoices,
  newAccountForm,
  type SavedAccountForForm,
  STUDENT_LOAN_PLAN_OPTIONS,
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
import { type AccountType, AccountTypeEnum, isLiabilityType } from "~/containers/accounts/utils";
import { TYPE_LABEL } from "~/features/accounts/components/AccountsGroupList";
import { JointOwnershipFields } from "~/features/accounts/components/JointOwnershipFields";
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

const { PROPERTY } = AccountTypeEnum;
const studentLoanPlans = [{ value: "", label: "Choose a plan" }, ...STUDENT_LOAN_PLAN_OPTIONS];
const PLAN_REQUIRED_MESSAGE = "Choose a repayment plan";
/** Shown before saving a type change that turns a debt into something you own (CH-4). */
const TYPE_FLIPS_SIGN_NOTE =
  "This turns the debt into something you own, so net worth this month and in every past month rises by twice its balance.";

/** The link select's "no property" choice. */
const NOT_LINKED_LABEL = "Not linked";

/** Hidden copy of the property value's info text, named in that field's aria-describedby. */
const HOME_VALUE_NOTE_ID = "account-home-value-note";

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

type AccountOption = SavedAccountForForm;

/** A mortgage the new property is for: after the property saves, the action links them. */
interface LinkMortgageTarget {
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
  /** Show sole/joint ownership and share controls for sole/new accounts (profile preference). */
  partnerMode?: boolean;
}

type FormState = AccountFormState;
type Prefill = AccountFormPrefill;

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
  partnerMode = false,
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
  ) ?? { name: "", type: ACCOUNT_FORM_TYPES[0], balance: undefined, studentLoanPlan: null };

  const prefill: Prefill = {
    initialName,
    initialType,
    initialSubtype,
    initialOwnership,
    initialSharePercent,
  };
  const [formInput, setFormInput] = useState<FormState>(() =>
    isEditAccount ? accountFormFromSaved(selectedAccount) : newAccountForm(prefill),
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
      latest.resetForOpen(newAccountForm(latest.prefill));
    }
  }, [openRequestKey]);

  const handleOpenModal = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    resetForOpen(isEditAccount ? accountFormFromSaved(selectedAccount) : newAccountForm(prefill));
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
  const values = accountFormValues(formInput);
  const effectiveOwnership = values.ownership as AccountOwnership;
  const resolvedShare = values.sharePercent === "" ? null : Number(values.sharePercent);

  // The properties a mortgage can be on, the one preselected, and whether the home value is asked
  // instead (adding a mortgage with no property to link adds both together, linked).
  const {
    linkable: linkableProperties,
    showHomeValue,
    showLinkSelect,
    linkedAccountId,
    propertyIsRental,
  } = mortgageLinkChoices({
    state: formInput,
    accounts,
    savedLinkedAccountId: selectedAccount.linkedAccountId,
    editing: Boolean(isEditAccount),
    linkTouched,
  });
  // The typed balance for the equity line; empty, not a number or below 0 counts as none.
  const typedOwed = formInput.balance === "" ? null : Number(formInput.balance);
  const equityOwed =
    typedOwed !== null && Number.isFinite(typedOwed) && typedOwed >= 0 ? typedOwed : null;

  const onSave = () => {
    if (accountFormNeedsPlan(formInput)) {
      setPlanError(PLAN_REQUIRED_MESSAGE);
      return;
    }
    // An edit sends what changed; an add sends the fields its type shows (the engine's rule).
    const toSend = accountFormToSend({
      editing: Boolean(isEditAccount),
      opened,
      current: formInput,
      linkedAccountId,
    });
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
  const startedJoint = isEditAccount && selectedAccount.ownership === "joint";
  const becomesSole = startedJoint && !fieldSet.joint;

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
                  options={ACCOUNT_FORM_TYPES.map((type) => ({
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
                    options={studentLoanPlans}
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
            {fieldSet.joint && (partnerMode || startedJoint || formInput.ownership === "joint") ? (
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
                            value: p.id,
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
