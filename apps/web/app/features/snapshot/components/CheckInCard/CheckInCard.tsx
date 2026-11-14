import { Button, InlineAlert } from "@repo/ui";
import { type FC, type KeyboardEvent, useEffect } from "react";
import type { CheckInAnswer, CheckInStep as CheckInStepModel } from "../../checkInModel";
import { CHECK_IN_COPY, checkInProgress } from "../../snapshotCopy";
import type { CheckInController } from "../../useCheckIn";
import { CheckInStep, checkInHeadingId, focusCheckInStep } from "../CheckInStep";
import { cardNav, cardNavGroup, cardRoot, cardSurface, progress } from "./CheckInCard.styles";

export interface CheckInCardProps {
  checkIn: CheckInController;
}

/**
 * The phone check-in (below md): one account at a time with "3 of 8", then one row of quiet
 * buttons: Back (and Next on a done account) and "No change to the rest". The balance field has
 * the focus as each account opens, so typing starts at once and Enter saves it as Update. A
 * confirmed answer is saved before the next account shows, so a failed save stays on its own card
 * with the error.
 */
export const CheckInCard: FC<CheckInCardProps> = ({ checkIn }) => {
  const { steps, index, setIndex } = checkIn;
  const step = steps[Math.min(index, steps.length - 1)];
  // Each account opens with its balance field focused, the first one too (the sheet keeps focus
  // that is already inside it). A done account (reached with Back, or with "Change a balance" from
  // the summary) focuses its name instead. Only
  // when the account changes: a save on the same account must not move focus.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the account alone
  useEffect(() => {
    if (!step) return;
    if (!checkIn.isDone(step.accountId)) focusCheckInStep(step.accountId);
    else document.getElementById(checkInHeadingId(step.accountId))?.focus();
  }, [step?.accountId]);

  if (!step) return null;
  const position = steps.indexOf(step) + 1;
  const done = checkIn.isDone(step.accountId);
  const anyOpen = steps.some((s) => !checkIn.isDone(s.accountId));
  const next = position < steps.length ? position : checkIn.nextOpen(position - 1);

  const answer = async (s: CheckInStepModel, a: CheckInAnswer) => {
    if (await checkIn.confirm(s, a)) {
      const n = checkIn.nextOpen(steps.indexOf(s), s.accountId);
      if (n !== -1) setIndex(n);
    }
  };
  // Enter in the balance field saves the typed figure as Update, as in the desktop list.
  const onFieldKeyDown = (event: KeyboardEvent<HTMLInputElement>, s: CheckInStepModel) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const draft = checkIn.draft(s.accountId);
    if (draft === null || checkIn.isSaving(s.accountId)) return;
    void answer(s, { kind: "update", value: draft });
  };
  const retry = async (s: CheckInStepModel) => {
    if (await checkIn.retry(s)) {
      const n = checkIn.nextOpen(steps.indexOf(s), s.accountId);
      if (n !== -1) setIndex(n);
    }
  };

  return (
    <div className={cardRoot()} data-testid="checkin-card" id="checkin-card">
      <p className={progress()} data-testid="checkin-progress" id="checkin-progress">
        {checkInProgress(position, steps.length)}
      </p>
      <section aria-labelledby={checkInHeadingId(step.accountId)} className={cardSurface()}>
        <CheckInStep
          checkIn={checkIn}
          key={step.accountId}
          layout="card"
          onAnswer={answer}
          onFieldKeyDown={onFieldKeyDown}
          onRetry={retry}
          step={step}
        />
      </section>
      <div className={cardNav()}>
        <div className={cardNavGroup()}>
          {position > 1 ? (
            <Button
              data-testid="checkin-back"
              id="checkin-back"
              onClick={() => setIndex(position - 2)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {CHECK_IN_COPY.back}
            </Button>
          ) : null}
          {done && next !== -1 ? (
            <Button
              data-testid="checkin-next"
              id="checkin-next"
              onClick={() => setIndex(next)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {CHECK_IN_COPY.next}
            </Button>
          ) : null}
        </div>
        {anyOpen ? (
          <Button
            data-testid="checkin-rest"
            id="checkin-rest"
            onClick={() => void checkIn.rest()}
            pending={checkIn.restSaving}
            size="sm"
            type="button"
            variant="ghost"
          >
            {CHECK_IN_COPY.rest}
          </Button>
        ) : null}
      </div>
      {checkIn.restError ? (
        <InlineAlert tone="danger">{CHECK_IN_COPY.restError}</InlineAlert>
      ) : null}
    </div>
  );
};

export default CheckInCard;
