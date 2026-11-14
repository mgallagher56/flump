import { Button, CurrencyInput, InlineAlert, StatusBadge, VisuallyHidden } from "@repo/ui";
import { type FC, type KeyboardEvent, useState } from "react";
import { TYPE_LABEL } from "~/features/accounts/components/AccountsGroupList";
import {
  type CheckInAnswer,
  type CheckInStep as CheckInStepModel,
  calculatedExplain,
  doneKind,
  statementPromptText,
} from "../../checkInModel";
import { CHECK_IN_COPY, checkInWholePounds, doneText, lastFigureText } from "../../snapshotCopy";
import type { CheckInController } from "../../useCheckIn";
import {
  actions,
  calculatedBlock,
  calculatedFigure,
  calculatedValue,
  controls,
  doneRow,
  doneStatus,
  fieldLabel,
  fieldWrap,
  quietLine,
  stepHead,
  stepMeta,
  stepName,
  stepRoot,
} from "./CheckInStep.styles";

export type CheckInStepLayout = "card" | "row";

export interface CheckInStepProps {
  step: CheckInStepModel;
  checkIn: CheckInController;
  /** `card`: one account per screen (phone). `row`: one row of the desktop list. */
  layout: CheckInStepLayout;
  /** The user chose an answer. The card waits for the save; the list moves on at once. */
  onAnswer: (step: CheckInStepModel, answer: CheckInAnswer) => void;
  /** Save a failed answer again. */
  onRetry: (step: CheckInStepModel) => void;
  /** The desktop list's keyboard flow (Enter and Tab on the balance field). */
  onFieldKeyDown?: (event: KeyboardEvent<HTMLInputElement>, step: CheckInStepModel) => void;
}

/** The balance field's id (and test id), also used to move focus to a step. */
export const checkInFieldId = (accountId: string) => `checkin-value-${accountId}`;
/** The "Keep this figure" button's id, the first control of a calculated step. */
export const checkInKeepId = (accountId: string) => `checkin-keep-${accountId}`;
export const checkInHeadingId = (accountId: string) => `checkin-name-${accountId}`;

/** Focus a step's first control: its balance field, or "Keep this figure" on a calculated step. */
export function focusCheckInStep(accountId: string): void {
  const el =
    document.getElementById(checkInFieldId(accountId)) ??
    document.getElementById(checkInKeepId(accountId));
  el?.focus();
}

/**
 * One account in the monthly check-in, worded the same on a phone card and in the desktop list:
 * the account, last month's figure and two choices (Update or No change). A loan or mortgage with
 * a known rate and payment shows its calculated figure instead, kept with one press. A done step
 * reads as a status ("Updated £3,400") with a Change button.
 */
export const CheckInStep: FC<CheckInStepProps> = ({
  step,
  checkIn,
  layout,
  onAnswer,
  onRetry,
  onFieldKeyDown,
}) => {
  const [typing, setTyping] = useState(false);
  const id = step.accountId;
  const label = TYPE_LABEL[step.type] ?? step.type;
  // "Current account" named "Current account" needs its type only once.
  const typeLabel = label.toLowerCase() === step.name.toLowerCase() ? null : label;
  const figure = checkIn.figure(id);
  const done = checkIn.isDone(id);
  const saving = checkIn.isSaving(id);
  const draft = checkIn.draft(id);
  const nameEl =
    layout === "card" ? (
      <h3 className={stepName({ layout })} id={checkInHeadingId(id)} tabIndex={-1}>
        {step.name}
      </h3>
    ) : (
      <h3 className={stepName({ layout })} id={checkInHeadingId(id)}>
        {step.name}
      </h3>
    );

  if (done && figure) {
    const status = saving ? CHECK_IN_COPY.saving : doneText(doneKind(step, figure), figure.value);
    const change = (
      <Button
        aria-label={`${CHECK_IN_COPY.change} ${step.name}`}
        data-testid={`checkin-change-${id}`}
        disabled={saving}
        id={`checkin-change-${id}`}
        onClick={() => {
          setTyping(false);
          checkIn.edit(id);
          setTimeout(() => focusCheckInStep(id), 0);
        }}
        size="sm"
        type="button"
        variant="secondary"
      >
        {CHECK_IN_COPY.change}
      </Button>
    );
    if (layout === "row") {
      return (
        <div className={doneRow()}>
          <div className={stepHead()}>
            {nameEl}
            <p
              className={doneStatus()}
              id={`checkin-status-${id}`}
              data-testid={`checkin-status-${id}`}
            >
              {status}
            </p>
          </div>
          {change}
        </div>
      );
    }
    return (
      <div className={stepRoot()}>
        <div className={stepHead()}>
          {nameEl}
          {typeLabel ? <p className={stepMeta()}>{typeLabel}</p> : null}
          <p className={stepMeta()}>{lastFigureText(step.lastValue)}</p>
        </div>
        <div className={doneRow()}>
          <p
            className={doneStatus()}
            id={`checkin-status-${id}`}
            data-testid={`checkin-status-${id}`}
          >
            {status}
          </p>
          {change}
        </div>
      </div>
    );
  }

  const calc = step.calculated;
  const showField = !calc || typing;
  const fieldLabelText = step.isLiability ? CHECK_IN_COPY.owedNow : CHECK_IN_COPY.newBalance;
  const canRepeat = step.lastValue !== null;

  return (
    <div className={stepRoot()}>
      <div className={stepHead()}>
        {nameEl}
        {typeLabel ? <p className={stepMeta()}>{typeLabel}</p> : null}
        <p className={stepMeta()}>{lastFigureText(step.lastValue)}</p>
      </div>

      {calc ? (
        <div className={calculatedBlock()}>
          <p className={calculatedFigure()}>
            <StatusBadge variant="neutral">{CHECK_IN_COPY.calculated}</StatusBadge>
            <span className={calculatedValue()}>{checkInWholePounds(calc.value)}</span>
          </p>
          <p className={quietLine()}>{calculatedExplain(calc)}</p>
          {step.statementPrompt ? (
            <p className={quietLine()}>{statementPromptText(step.statementPrompt)}</p>
          ) : null}
        </div>
      ) : null}

      <div className={controls({ layout })}>
        {showField ? (
          <div className={fieldWrap({ layout })}>
            <label className={fieldLabel()} htmlFor={checkInFieldId(id)}>
              {fieldLabelText}
              <VisuallyHidden>, {step.name}</VisuallyHidden>
            </label>
            <CurrencyInput
              data-testid={checkInFieldId(id)}
              id={checkInFieldId(id)}
              min={0}
              onKeyDown={onFieldKeyDown ? (event) => onFieldKeyDown(event, step) : undefined}
              onValueChange={(v) => checkIn.setDraft(id, v)}
              value={draft}
            />
          </div>
        ) : null}

        <div className={actions({ layout })}>
          {showField ? (
            <Button
              data-testid={`checkin-update-${id}`}
              disabled={draft === null}
              id={`checkin-update-${id}`}
              onClick={() => {
                if (draft !== null) onAnswer(step, { kind: "update", value: draft });
              }}
              pending={saving}
              size="sm"
              type="button"
            >
              {CHECK_IN_COPY.update}
            </Button>
          ) : null}
          {calc ? (
            <Button
              data-testid={checkInKeepId(id)}
              disabled={saving}
              id={checkInKeepId(id)}
              onClick={() => onAnswer(step, { kind: "keepCalculated" })}
              size="sm"
              type="button"
              variant={showField ? "secondary" : "primary"}
            >
              {CHECK_IN_COPY.keep}
            </Button>
          ) : (
            <Button
              data-testid={`checkin-same-${id}`}
              disabled={!canRepeat || saving}
              id={`checkin-same-${id}`}
              onClick={() => onAnswer(step, { kind: "noChange" })}
              size="sm"
              type="button"
              // In the list, Update is each row's primary; No change is the quieter choice.
              variant={layout === "row" ? "ghost" : "secondary"}
            >
              {CHECK_IN_COPY.noChange}
            </Button>
          )}
          {calc && !typing ? (
            <Button
              data-testid={`checkin-different-${id}`}
              id={`checkin-different-${id}`}
              onClick={() => {
                setTyping(true);
                setTimeout(() => document.getElementById(checkInFieldId(id))?.focus(), 0);
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              {CHECK_IN_COPY.enterDifferent}
            </Button>
          ) : null}
        </div>
      </div>

      {checkIn.hasError(id) ? (
        <InlineAlert
          action={
            <Button
              data-testid={`checkin-retry-${id}`}
              id={`checkin-retry-${id}`}
              onClick={() => onRetry(step)}
              pending={saving}
              size="sm"
              type="button"
              variant="secondary"
            >
              {CHECK_IN_COPY.tryAgain}
            </Button>
          }
          tone="danger"
        >
          {CHECK_IN_COPY.stepError}
        </InlineAlert>
      ) : null}
    </div>
  );
};

export default CheckInStep;
