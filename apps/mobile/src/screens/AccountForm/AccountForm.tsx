import {
  ACCOUNT_FORM_TYPES,
  MORTGAGE_REPAYMENT_OPTIONS,
  OWNERSHIP_OPTIONS,
  STUDENT_LOAN_PLAN_OPTIONS,
} from "@flump/finance-engine/account-form";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { ScrollViewInstance } from "react-native";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { CurrencyInput } from "../../components/CurrencyInput";
import { DateField } from "../../components/DateField";
import { ErrorState } from "../../components/ErrorState";
import { FormField } from "../../components/FormField";
import { InlineAlert } from "../../components/InlineAlert";
import { PercentInput } from "../../components/PercentInput";
import { Screen } from "../../components/Screen";
import { SelectField } from "../../components/SelectField";
import { Skeleton } from "../../components/Skeleton";
import { Text } from "../../components/Text";
import { TextField } from "../../components/TextField";
import { WholeNumberInput } from "../../components/WholeNumberInput";
import { ACCOUNT_FORM, DELETE_ACCOUNT } from "../../copy/accountForms";
import { ACCOUNT, ACCOUNTS, TYPE_LABEL } from "../../copy/accounts";
import { CHECK_IN } from "../../copy/checkIn";
import { useAccounts } from "../../data/checkIn";
import { useProfile } from "../../data/profile";
import { useDelayedLoading } from "../../data/useDelayedLoading";
import type { AccountFormMode, FormAccount } from "../../features/accounts/useAccountForm";
import { type AccountForm as Form, useAccountForm } from "../../features/accounts/useAccountForm";

export interface AccountFormScreenProps
  extends Omit<AccountFormProps, "mode" | "accounts" | "partnerMode"> {
  /** Add (with web's estimate prefill for "Add an estimate"), or edit the account with this id. */
  open: { kind: "add"; estimate?: boolean } | { kind: "edit"; id: string };
  /** Back to the accounts list, when the account to edit is not there. */
  onBackToAccounts(): void;
}

/**
 * The form with what it reads: the accounts (for the account to edit, the mortgage's property and
 * the estimate's prefill) and the profile's partner mode, both from the cached queries the list
 * already made. Nothing shows until the accounts are read; a failed read says so with Try again.
 */
export function AccountFormScreen({ open, onBackToAccounts, ...props }: AccountFormScreenProps) {
  const accounts = useAccounts();
  // The account the edit form opened with. Once a delete lands it leaves the cached list at once,
  // and the form keeps it while the screen closes, so it never reads as not found.
  const opened = useRef<FormAccount | null>(null);
  const profile = useProfile();
  const list = useMemo(
    () => (accounts.data ?? []) as unknown as readonly FormAccount[],
    [accounts.data],
  );
  const title = open.kind === "edit" ? ACCOUNT_FORM.editTitle : ACCOUNT_FORM.addTitle;
  const header = props.header ?? (() => null);
  if (accounts.isError && !accounts.data) {
    return (
      <>
        {header(title)}
        <Screen edges={EDGES} testID="account-form">
          <ErrorState
            heading={CHECK_IN.loadErrorHeading}
            body={CHECK_IN.loadErrorBody}
            retryLabel={CHECK_IN.tryAgain}
            testID="account-form-error"
            retryTestID="account-form-retry"
            onRetry={() => void accounts.refetch()}
          />
        </Screen>
      </>
    );
  }
  // The profile only decides whether ownership shows on a sole account; a failed read leaves it off.
  if (!accounts.data || (profile.isPending && !profile.isError)) {
    return (
      <>
        {header(title)}
        <AccountFormLoading />
      </>
    );
  }
  // Read loosely, as S6 reads the home estimate: the profile pick keeps fields it does not name,
  // and an older backend without partner mode leaves it off, web's default.
  const partnerMode =
    (profile.data as { partnerMode?: unknown } | null | undefined)?.partnerMode === true;
  if (open.kind === "edit") {
    const found = list.find((a) => a.id === open.id);
    if (found) opened.current = found;
    // Only the account this form opened with, never one from an earlier id.
    const account = found ?? (opened.current?.id === open.id ? opened.current : null);
    if (!account) {
      return (
        <>
          {header(title)}
          <Screen edges={EDGES} testID="account-form">
            <Text testID="account-form-not-found">{ACCOUNT.notFound}</Text>
            <Button
              label={ACCOUNT.backToAccounts}
              variant="secondary"
              testID="account-form-back"
              onPress={onBackToAccounts}
            />
          </Screen>
        </>
      );
    }
    return (
      <AccountForm
        {...props}
        mode={{ kind: "edit", account }}
        accounts={list}
        partnerMode={partnerMode}
      />
    );
  }
  return (
    <AccountForm
      {...props}
      mode={{ kind: "add", estimate: open.estimate }}
      accounts={list}
      partnerMode={partnerMode}
    />
  );
}

/** S5's loading rule: nothing for 200 ms, then a busy placeholder that stays at least 400 ms. */
function AccountFormLoading() {
  const skeleton = useDelayedLoading(true);
  return (
    <Screen edges={EDGES} testID="account-form-loading">
      {skeleton ? <Skeleton label={ACCOUNTS.loading} testID="account-form-skeleton" /> : null}
    </Screen>
  );
}

/** Under the stack header, which pads the top. */
const EDGES = ["right", "bottom", "left"] as const;

const TYPE_OPTIONS = ACCOUNT_FORM_TYPES.map((type) => ({
  value: type,
  label: TYPE_LABEL[type] ?? type,
}));
const PLAN_OPTIONS = [
  { value: "", label: ACCOUNT_FORM.choosePlan },
  ...STUDENT_LOAN_PLAN_OPTIONS.map((p) => ({ value: p.value, label: p.label })),
];
const REPAID_OPTIONS = [{ value: "", label: ACCOUNT_FORM.notSet }, ...MORTGAGE_REPAYMENT_OPTIONS];

interface AccountFormProps {
  mode: AccountFormMode;
  accounts: readonly FormAccount[];
  partnerMode: boolean;
  onSaved(notice?: string): void;
  onDeleted(): void;
  onCancel(): void;
  /** The stack header with the form's title (the route's `Stack.Screen`). */
  header?(title: string): ReactNode;
}

/**
 * Add or edit one account (E12 S8, plan 9.9b), with web's fields for its type, web's words and
 * web's rules from the engine's shared form logic. Delete sits inside edit, as web's, and asks
 * first with the platform's own alert, saying what is removed.
 */
function AccountForm({
  mode,
  accounts,
  partnerMode,
  onSaved,
  onDeleted,
  onCancel,
  header = () => null,
}: AccountFormProps) {
  const form = useAccountForm({ mode, accounts, partnerMode, onSaved, onDeleted });
  const [confirming, setConfirming] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  // A new alert sits at the top while Save is at the bottom: bring it into view.
  useEffect(() => {
    if (form.alertCount > 0) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [form.alertCount]);
  const deleteName = (mode.kind === "edit" && mode.account.name) || DELETE_ACCOUNT.fallbackName;
  return (
    <>
      {header(form.editing ? ACCOUNT_FORM.editTitle : ACCOUNT_FORM.addTitle)}
      <Screen edges={EDGES} keyboardAware scrollRef={scrollRef} testID="account-form">
        {form.alert ? <InlineAlert message={form.alert} testID="account-form-alert" /> : null}
        <Fields form={form} />
        <Button
          label={form.editing ? ACCOUNT_FORM.save : ACCOUNT_FORM.addTitle}
          pending={form.busy === "saving"}
          testID="account-form-save"
          onPress={() => void form.save()}
        />
        <Button
          label={ACCOUNT_FORM.cancel}
          variant="ghost"
          testID="account-form-cancel"
          onPress={onCancel}
        />
        {form.editing ? (
          <Button
            label={ACCOUNT_FORM.delete}
            variant="dangerSubtle"
            pending={form.busy === "deleting"}
            testID="account-form-delete"
            onPress={() => setConfirming(true)}
          />
        ) : null}
      </Screen>
      <ConfirmDialog
        visible={confirming}
        title={DELETE_ACCOUNT.title(deleteName)}
        message={DELETE_ACCOUNT.consequence}
        confirmLabel={DELETE_ACCOUNT.confirm(deleteName)}
        cancelLabel={ACCOUNT_FORM.cancel}
        tone="destructive"
        onConfirm={() => {
          setConfirming(false);
          void form.remove();
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

/** A note under a field: a fact about what saving does, never an error. */
function Note({ children, testID }: { children: string; testID?: string }) {
  return (
    <Text textStyle="body.sm" color="secondary" testID={testID}>
      {children}
    </Text>
  );
}

function Fields({ form }: { form: Form }) {
  const { form: values, fieldSet, errors, links } = form;
  const editable = form.busy === null;
  const kindOptions = fieldSet.kind
    ? [{ value: "", label: ACCOUNT_FORM.notSet }, ...fieldSet.kind.options]
    : [];
  const balanceLabel = form.owed ? ACCOUNT_FORM.owed : ACCOUNT_FORM.balance;
  return (
    <>
      <FormField label={ACCOUNT_FORM.name} error={errors.name}>
        <TextField
          value={values.name}
          onChangeText={(text) => form.set("name", text)}
          accessibilityLabel={ACCOUNT_FORM.name}
          editable={editable}
          testID="account-form-name"
        />
      </FormField>
      <FormField label={ACCOUNT_FORM.accountType}>
        <SelectField
          label={ACCOUNT_FORM.accountType}
          options={TYPE_OPTIONS}
          value={values.type}
          onChange={form.setType}
          editable={editable}
          testID="account-form-type"
        />
      </FormField>
      {form.typeFlipsSign ? (
        <Note testID="account-form-type-flips-sign">{ACCOUNT_FORM.typeFlipsSign}</Note>
      ) : null}
      {fieldSet.kind ? (
        <FormField label={fieldSet.kind.label}>
          <SelectField
            label={fieldSet.kind.label}
            options={kindOptions}
            value={values.accountSubtype}
            onChange={(v) => form.set("accountSubtype", v)}
            editable={editable}
            testID="account-form-kind"
          />
        </FormField>
      ) : null}
      {fieldSet.studentLoanPlan ? (
        <FormField label={ACCOUNT_FORM.repaymentPlan} error={errors.studentLoanPlan}>
          <SelectField
            label={ACCOUNT_FORM.repaymentPlan}
            options={PLAN_OPTIONS}
            value={values.studentLoanPlan}
            onChange={(v) => form.set("studentLoanPlan", v)}
            editable={editable}
            testID="account-form-plan"
          />
        </FormField>
      ) : null}
      <FormField
        label={balanceLabel}
        hint={form.wholeBalanceHint ?? undefined}
        error={errors.balance}
      >
        <CurrencyInput
          value={values.balance === "" ? null : Number(values.balance)}
          onValueChange={(v, text) => form.setFigure("balance", v, text)}
          // A balance can be below zero (an overdrawn current account); an amount owed cannot.
          allowNegative={!form.owed}
          accessibilityLabel={balanceLabel}
          editable={editable}
          testID="account-form-balance"
        />
      </FormField>
      {fieldSet.interestRate ? (
        <FormField label={fieldSet.interestRate.label} error={errors.interestRate}>
          <PercentInput
            value={values.interestRate === "" ? null : Number(values.interestRate)}
            onValueChange={(v, text) => form.setFigure("interestRate", v, text)}
            accessibilityLabel={fieldSet.interestRate.label}
            editable={editable}
            testID="account-form-rate"
          />
        </FormField>
      ) : null}
      {fieldSet.monthlyContribution ? (
        <FormField label={fieldSet.monthlyContribution.label} error={errors.monthlyContribution}>
          <CurrencyInput
            value={values.monthlyContribution === "" ? null : Number(values.monthlyContribution)}
            onValueChange={(v, text) => form.setFigure("monthlyContribution", v, text)}
            accessibilityLabel={fieldSet.monthlyContribution.label}
            editable={editable}
            testID="account-form-monthly"
          />
        </FormField>
      ) : null}
      {form.showsJoint ? (
        <>
          <FormField label={ACCOUNT_FORM.ownership}>
            <SelectField
              label={ACCOUNT_FORM.ownership}
              options={OWNERSHIP_OPTIONS}
              value={values.ownership}
              onChange={(v) => form.setOwnership(v === "joint" ? "joint" : "sole")}
              editable={editable}
              testID="account-form-ownership"
            />
          </FormField>
          {values.ownership === "joint" ? (
            <FormField label={ACCOUNT_FORM.yourShare} error={errors.sharePercent}>
              <PercentInput
                value={values.sharePercent}
                decimals={0}
                onValueChange={form.setShare}
                accessibilityLabel={ACCOUNT_FORM.yourShare}
                editable={editable}
                testID="account-form-share"
              />
            </FormField>
          ) : null}
          {form.jointLiabilityNotice ? (
            <Note testID="account-form-joint-notice">{form.jointLiabilityNotice}</Note>
          ) : null}
        </>
      ) : form.becomesSole ? (
        <Note testID="account-form-becomes-sole">{ACCOUNT_FORM.becomesSole}</Note>
      ) : null}
      {fieldSet.mortgageFields ? (
        <>
          <FormField label={ACCOUNT_FORM.repaid}>
            <SelectField
              label={ACCOUNT_FORM.repaid}
              options={REPAID_OPTIONS}
              value={values.repaymentType}
              onChange={(v) => form.set("repaymentType", v)}
              editable={editable}
              testID="account-form-repaid"
            />
          </FormField>
          <FormField label={ACCOUNT_FORM.yearsLeft} error={errors.termYears}>
            <WholeNumberInput
              value={values.termYears === "" ? null : Number(values.termYears)}
              onValueChange={(v, text) => form.setFigure("termYears", v, text)}
              accessibilityLabel={ACCOUNT_FORM.yearsLeft}
              editable={editable}
              testID="account-form-years"
            />
          </FormField>
          <FormField label={ACCOUNT_FORM.months} error={errors.termExtraMonths}>
            <WholeNumberInput
              value={values.termExtraMonths === "" ? null : Number(values.termExtraMonths)}
              onValueChange={(v, text) => form.setFigure("termExtraMonths", v, text)}
              accessibilityLabel={ACCOUNT_FORM.months}
              editable={editable}
              testID="account-form-months"
            />
          </FormField>
          <FormField label={ACCOUNT_FORM.fixedRateEnds} error={errors.fixedRateEndDate}>
            <DateField
              label={ACCOUNT_FORM.fixedRateEnds}
              value={values.fixedRateEndDate}
              onValueChange={(next) => form.setDate("fixedRateEndDate", next)}
              clearable
              editable={editable}
              testID="account-form-fixed-rate"
            />
          </FormField>
          {links.showLinkSelect ? (
            <FormField label={ACCOUNT_FORM.whichProperty}>
              <SelectField
                label={ACCOUNT_FORM.whichProperty}
                options={[
                  { value: "", label: ACCOUNT_FORM.notLinked },
                  ...links.linkable.map((p) => ({
                    value: p.id,
                    label: p.name || ACCOUNT_FORM.propertyFallback,
                  })),
                ]}
                value={links.linkedAccountId}
                onChange={form.chooseProperty}
                editable={editable}
                testID="account-form-property"
              />
            </FormField>
          ) : null}
        </>
      ) : null}
      {links.showHomeValue ? (
        <FormField
          label={links.propertyIsRental ? ACCOUNT_FORM.propertyValue : ACCOUNT_FORM.homeValue}
          hint={
            links.propertyIsRental ? ACCOUNT_FORM.propertyValueHint : ACCOUNT_FORM.homeValueHint
          }
          error={errors.homeValue}
        >
          <CurrencyInput
            value={form.homeValue}
            onValueChange={form.setHome}
            accessibilityLabel={
              links.propertyIsRental ? ACCOUNT_FORM.propertyValue : ACCOUNT_FORM.homeValue
            }
            editable={editable}
            testID="account-form-home-value"
          />
        </FormField>
      ) : null}
      {fieldSet.creditFields ? (
        <>
          <FormField
            label={ACCOUNT_FORM.creditLimit}
            hint={ACCOUNT_FORM.creditLimitHint}
            error={errors.creditLimit}
          >
            <CurrencyInput
              value={values.creditLimit === "" ? null : Number(values.creditLimit)}
              onValueChange={(v, text) => form.setFigure("creditLimit", v, text)}
              accessibilityLabel={ACCOUNT_FORM.creditLimit}
              accessibilityHint={ACCOUNT_FORM.creditLimitHint}
              editable={editable}
              testID="account-form-credit-limit"
            />
          </FormField>
          <FormField
            label={ACCOUNT_FORM.promoEnds}
            hint={ACCOUNT_FORM.promoEndsHint}
            error={errors.promoZeroPercentUntil}
          >
            <DateField
              label={ACCOUNT_FORM.promoEnds}
              value={values.promoZeroPercentUntil}
              onValueChange={(next) => form.setDate("promoZeroPercentUntil", next)}
              clearable
              editable={editable}
              testID="account-form-promo"
            />
          </FormField>
        </>
      ) : null}
    </>
  );
}
