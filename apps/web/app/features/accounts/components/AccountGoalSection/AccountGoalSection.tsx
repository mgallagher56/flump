import type { AccountGoalDto } from "@flump/api-contract";
import { Button, CurrencyInput, controlProps, FormField, InlineAlert, TextInput } from "@repo/ui";
import { type FC, type FormEvent, useEffect, useState } from "react";
import type { FetcherOutcomeStatus } from "~/features/feedback/hooks/useFetcherOutcome";
import {
  goalActionsRow,
  goalFieldsGrid,
  goalForm,
  goalHeaderRow,
  goalLabelText,
  goalPrimaryLine,
  goalSecondaryLine,
  goalSectionRoot,
} from "./AccountGoalSection.styles";

export interface AccountGoalInput {
  targetAmount: number | null;
  targetDate: string | null;
  label: string | null;
}

export interface AccountGoalSectionProps {
  /** Current saved balance shown on the account page (debts positive). */
  currentBalance: number;
  isLiability: boolean;
  /** Earliest recorded balance in the same display sign (debts positive), for progress wording. */
  earliestRecord?: { value: number; month: number; year: number } | null;
  goal: AccountGoalDto | null;
  onSave: (input: AccountGoalInput) => void;
  onRemove: () => void;
  status: FetcherOutcomeStatus;
  error?: string | null;
  onOpen?: () => void;
}

const wholeGbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const monthYearFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const monthOnlyFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  timeZone: "UTC",
});

export function formatGoalMonthYear(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return monthYearFormatter.format(parsed);
}

function formatMonthOnly(month: number, year: number): string {
  const parsed = new Date(Date.UTC(year, month - 1, 1));
  return monthOnlyFormatter.format(parsed);
}

export function formatGoalSummaryLine(goal: AccountGoalDto, isLiability: boolean): string {
  const datePart = goal.targetDate ? ` by ${formatGoalMonthYear(goal.targetDate)}` : "";
  if (goal.targetAmount !== null) {
    const amount = wholeGbp.format(Math.round(goal.targetAmount));
    return isLiability
      ? `Goal: ${amount} owed${datePart}.`
      : `Goal: ${amount} in this account${datePart}.`;
  }
  if (goal.targetDate) {
    return `Goal: by ${formatGoalMonthYear(goal.targetDate)}.`;
  }
  return goal.label ? `Goal: ${goal.label}.` : "Goal set.";
}

export function formatGoalProgressLine(
  currentBalance: number,
  earliestRecord: { value: number; month: number; year: number } | null | undefined,
  isLiability: boolean,
): string | null {
  if (!earliestRecord) return null;
  const delta = Math.round(currentBalance - earliestRecord.value);
  if (delta === 0) return null;
  const since = formatMonthOnly(earliestRecord.month, earliestRecord.year);
  if (isLiability && delta < 0) {
    return `${wholeGbp.format(Math.abs(delta))} paid off since ${since}.`;
  }
  const absFormatted = wholeGbp.format(Math.abs(delta));
  const signed = delta > 0 ? `+${absFormatted}` : `−${absFormatted}`;
  return `Balance changed by ${signed} since ${since}.`;
}

export function isGoalReached(
  goal: AccountGoalDto,
  currentBalance: number,
  isLiability: boolean,
): boolean {
  if (goal.targetAmount === null) return false;
  return isLiability ? currentBalance <= goal.targetAmount : currentBalance >= goal.targetAmount;
}

export function formatGoalReachedLine(goal: AccountGoalDto, currentBalance: number): string {
  const balance = wholeGbp.format(Math.round(currentBalance));
  if (goal.targetDate) {
    return `Balance ${balance}. You set this goal for ${formatGoalMonthYear(goal.targetDate)}.`;
  }
  return `Balance ${balance}. You set this goal.`;
}

/**
 * Optional user-set goal on an account (E35 Set 2).
 * - Never suggests a goal, amount, or date (R2, R4, O13).
 * - Accepts any size without comment and lets a goal be changed or removed without guilt (N4, N5).
 * - Changes nothing on screen for a passed date or unreached goal (N3).
 */
export const AccountGoalSection: FC<AccountGoalSectionProps> = ({
  currentBalance,
  isLiability,
  earliestRecord,
  goal,
  onSave,
  onRemove,
  status,
  error,
  onOpen,
}) => {
  const [editing, setEditing] = useState(false);
  const [targetAmount, setTargetAmount] = useState<number | null>(goal?.targetAmount ?? null);
  const [targetDate, setTargetDate] = useState<string>(goal?.targetDate ?? "");
  const [label, setLabel] = useState<string>(goal?.label ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<"create" | "change" | "remove" | null>(null);

  const pending = status === "pending";

  useEffect(() => {
    if (status === "succeeded" && lastAction) {
      setEditing(false);
      setStatusNote(
        lastAction === "change"
          ? "Goal changed."
          : lastAction === "remove"
            ? "Goal removed."
            : "Goal saved.",
      );
      setLastAction(null);
    }
  }, [status, lastAction]);

  const openEditor = () => {
    onOpen?.();
    setTargetAmount(goal?.targetAmount ?? null);
    setTargetDate(goal?.targetDate ?? "");
    setLabel(goal?.label ?? "");
    setFieldError(null);
    setStatusNote(null);
    setEditing(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedDate = targetDate.trim();
    const trimmedLabel = label.trim();
    if (targetAmount === null && trimmedDate === "" && trimmedLabel === "") {
      setFieldError("Enter an amount, a date, or a note for your goal.");
      return;
    }
    if (targetAmount !== null && targetAmount < 0) {
      setFieldError("Enter an amount of £0 or more.");
      return;
    }
    setFieldError(null);
    setLastAction(goal ? "change" : "create");
    onSave({
      targetAmount,
      targetDate: trimmedDate === "" ? null : trimmedDate,
      label: trimmedLabel === "" ? null : trimmedLabel,
    });
  };

  const handleRemove = () => {
    setStatusNote(null);
    setLastAction("remove");
    onRemove();
  };

  if (editing) {
    return (
      <section
        aria-label="Account goal"
        className={goalSectionRoot()}
        data-testid="account-goal-section"
        id="account-goal-section"
      >
        <form className={goalForm()} noValidate onSubmit={handleSubmit}>
          <div className={goalFieldsGrid()}>
            <FormField label="Target amount (optional)">
              {(fp) => (
                <CurrencyInput
                  {...controlProps(fp)}
                  data-testid="account-goal-amount"
                  onValueChange={(next) => {
                    setTargetAmount(next);
                    setFieldError(null);
                  }}
                  value={targetAmount}
                />
              )}
            </FormField>
            <FormField label="Target date (optional)">
              {(fp) => (
                <TextInput
                  {...controlProps(fp)}
                  data-testid="account-goal-date"
                  onChange={(e) => {
                    setTargetDate(e.target.value);
                    setFieldError(null);
                  }}
                  type="date"
                  value={targetDate}
                />
              )}
            </FormField>
            <FormField label="Note (optional)">
              {(fp) => (
                <TextInput
                  {...controlProps(fp)}
                  data-testid="account-goal-label"
                  maxLength={120}
                  onChange={(e) => {
                    setLabel(e.target.value);
                    setFieldError(null);
                  }}
                  value={label}
                />
              )}
            </FormField>
          </div>

          {fieldError || error ? (
            <InlineAlert tone="danger">{fieldError ?? error}</InlineAlert>
          ) : null}

          <div className={goalActionsRow()}>
            <Button
              data-testid="account-goal-save"
              disabled={pending}
              id="account-goal-save"
              size="sm"
              type="submit"
            >
              {pending ? "Saving…" : "Save goal"}
            </Button>
            <Button
              data-testid="account-goal-cancel"
              disabled={pending}
              id="account-goal-cancel"
              onClick={() => setEditing(false)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </form>
      </section>
    );
  }

  if (!goal) {
    return (
      <section
        aria-label="Account goal"
        className={goalSectionRoot()}
        data-testid="account-goal-section"
        id="account-goal-section"
      >
        <div className={goalHeaderRow()}>
          <Button
            data-testid="account-goal-set"
            id="account-goal-set"
            onClick={openEditor}
            size="sm"
            type="button"
            variant="outline"
          >
            Set a goal
          </Button>
          {statusNote ? (
            <p
              className={goalSecondaryLine()}
              data-testid="account-goal-status"
              id="account-goal-status"
            >
              {statusNote}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  const reached = isGoalReached(goal, currentBalance, isLiability);
  const progressLine = formatGoalProgressLine(currentBalance, earliestRecord, isLiability);

  return (
    <section
      aria-label="Account goal"
      className={goalSectionRoot()}
      data-testid="account-goal-section"
      id="account-goal-section"
    >
      {goal.label ? <p className={goalLabelText()}>{goal.label}</p> : null}
      <p className={goalPrimaryLine()} data-testid="account-goal-summary" id="account-goal-summary">
        {formatGoalSummaryLine(goal, isLiability)}
      </p>
      {progressLine ? (
        <p
          className={goalSecondaryLine()}
          data-testid="account-goal-progress"
          id="account-goal-progress"
        >
          {progressLine}
        </p>
      ) : null}
      {reached ? (
        <p
          className={goalSecondaryLine()}
          data-testid="account-goal-reached"
          id="account-goal-reached"
        >
          {formatGoalReachedLine(goal, currentBalance)}
        </p>
      ) : null}
      {statusNote ? (
        <p
          className={goalSecondaryLine()}
          data-testid="account-goal-status"
          id="account-goal-status"
        >
          {statusNote}
        </p>
      ) : null}
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
      <div className={goalActionsRow()}>
        <Button
          data-testid="account-goal-change"
          disabled={pending}
          id="account-goal-change"
          onClick={openEditor}
          size="sm"
          type="button"
          variant="outline"
        >
          Change goal
        </Button>
        <Button
          data-testid="account-goal-remove"
          disabled={pending}
          id="account-goal-remove"
          onClick={handleRemove}
          size="sm"
          type="button"
          variant="ghost"
        >
          Remove goal
        </Button>
      </div>
    </section>
  );
};

export default AccountGoalSection;
