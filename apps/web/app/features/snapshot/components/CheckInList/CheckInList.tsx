import { Button, InlineAlert } from "@repo/ui";
import type { FC, KeyboardEvent } from "react";
import {
  answerValue,
  type CheckInAnswer,
  type CheckInStep as CheckInStepModel,
  restAnswer,
} from "../../checkInModel";
import { CHECK_IN_COPY } from "../../snapshotCopy";
import { formatMonth } from "../../snapshotModel";
import type { CheckInController } from "../../useCheckIn";
import { CheckInStep, focusCheckInStep } from "../CheckInStep";
import { listFooter, listItem, listRoot, rowList } from "./CheckInList.styles";

export interface CheckInListProps {
  checkIn: CheckInController;
}

/**
 * The desktop check-in (md and up): every account in one list. Keyboard: the focused row's field
 * takes a figure; Enter saves it (or, on an empty field, records No change) and moves to the next
 * open row; Tab saves a typed figure and moves on, and on an empty field just moves. Saved rows
 * collapse to a status with a Change button. Each answer is saved straight away; a failed save
 * reopens its row with the error.
 */
export const CheckInList: FC<CheckInListProps> = ({ checkIn }) => {
  const { steps } = checkIn;

  const moveOn = (step: CheckInStepModel) => {
    const n = checkIn.nextOpen(steps.indexOf(step), step.accountId);
    const target = n === -1 ? null : steps[n];
    if (target) setTimeout(() => focusCheckInStep(target.accountId), 0);
  };

  const answer = (step: CheckInStepModel, a: CheckInAnswer) => {
    void checkIn.confirm(step, a);
    moveOn(step);
  };

  const onFieldKeyDown = (event: KeyboardEvent<HTMLInputElement>, step: CheckInStepModel) => {
    const draft = checkIn.draft(step.accountId);
    if (event.key === "Enter") {
      event.preventDefault();
      const a: CheckInAnswer = draft !== null ? { kind: "update", value: draft } : restAnswer(step);
      if (answerValue(step, a) === null) return;
      answer(step, a);
      return;
    }
    if (event.key === "Tab" && !event.shiftKey && draft !== null) {
      event.preventDefault();
      answer(step, { kind: "update", value: draft });
    }
  };

  const anyOpen = steps.some((s) => !checkIn.isDone(s.accountId));

  return (
    <div className={listRoot()} data-testid="checkin-list" id="checkin-list">
      <ul aria-label={`Balances for ${formatMonth(checkIn.month)}`} className={rowList()}>
        {steps.map((step) => (
          <li className={listItem()} key={step.accountId}>
            <CheckInStep
              checkIn={checkIn}
              layout="row"
              onAnswer={answer}
              onFieldKeyDown={onFieldKeyDown}
              onRetry={(s) => void checkIn.retry(s)}
              step={step}
            />
          </li>
        ))}
      </ul>
      {anyOpen ? (
        <div className={listFooter()}>
          <Button
            data-testid="checkin-rest"
            id="checkin-rest"
            onClick={() => void checkIn.rest()}
            pending={checkIn.restSaving}
            size="sm"
            type="button"
            // The same quiet ghost button as on the phone card.
            variant="ghost"
          >
            {CHECK_IN_COPY.rest}
          </Button>
        </div>
      ) : null}
      {checkIn.restError ? (
        <InlineAlert tone="danger">{CHECK_IN_COPY.restError}</InlineAlert>
      ) : null}
    </div>
  );
};

export default CheckInList;
