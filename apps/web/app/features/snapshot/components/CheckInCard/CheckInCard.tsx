import { Button, InlineAlert, ProgressBar } from "@repo/ui";
import { type FC, type KeyboardEvent, useEffect, useRef } from "react";
import type { CheckInAnswer, CheckInStep as CheckInStepModel } from "../../checkInModel";
import { CHECK_IN_COPY, checkInProgress } from "../../snapshotCopy";
import type { CheckInController } from "../../useCheckIn";
import { CheckInStep, checkInHeadingId } from "../CheckInStep";
import { cardNav, cardRoot, cardSurface, restButton } from "./CheckInCard.styles";

export interface CheckInCardProps {
  checkIn: CheckInController;
}

/**
 * The phone check-in (below md): one account at a time with "3 of 8", Back to the one before, and
 * "No change to the rest" under the card. A confirmed answer is saved before the next account
 * shows, so a failed save stays on its own card with the error.
 */
export const CheckInCard: FC<CheckInCardProps> = ({ checkIn }) => {
  const { steps, index, setIndex } = checkIn;
  const step = steps[Math.min(index, steps.length - 1)];
  const firstRender = useRef(true);

  // Move focus to the new account's name when the card changes (not on first open: the sheet
  // places focus itself).
  useEffect(() => {
    if (!step) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.getElementById(checkInHeadingId(step.accountId))?.focus();
  }, [step]);

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
      <ProgressBar
        max={steps.length}
        size="sm"
        value={position}
        valueDisplay={checkInProgress(position, steps.length)}
      />
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
        {position > 1 ? (
          <Button
            data-testid="checkin-back"
            id="checkin-back"
            onClick={() => setIndex(position - 2)}
            size="sm"
            type="button"
            variant="secondary"
          >
            {CHECK_IN_COPY.back}
          </Button>
        ) : (
          <span />
        )}
        {done && next !== -1 ? (
          <Button
            data-testid="checkin-next"
            id="checkin-next"
            onClick={() => setIndex(next)}
            size="sm"
            type="button"
            variant="secondary"
          >
            {CHECK_IN_COPY.next}
          </Button>
        ) : null}
      </div>
      {anyOpen ? (
        <Button
          className={restButton()}
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
      {checkIn.restError ? (
        <InlineAlert tone="danger">{CHECK_IN_COPY.restError}</InlineAlert>
      ) : null}
    </div>
  );
};

export default CheckInCard;
