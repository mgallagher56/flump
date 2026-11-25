import type { WellbeingFeeling } from "@flump/api-contract";
import { Button, FormField, InlineAlert, RadioCardGroup } from "@repo/ui";
import { type FC, useEffect, useState } from "react";
import {
  WELLBEING_COPY,
  WELLBEING_OPTIONS,
  WELLBEING_TEXT_MAX_LENGTH,
  type WellbeingQuestionsApi,
  wellbeingAnswer,
  wellbeingQuestionsApi,
} from "../../wellbeingQuestions";
import {
  questionsActions,
  questionsCard,
  questionsHeading,
  questionsThanks,
  worseTextArea,
} from "./WellbeingQuestions.styles";

type Phase = "waiting" | "asking" | "sending" | "thanked" | "closed";

export interface WellbeingQuestionsProps {
  /** The calls to make; the real API unless a test or story passes its own. */
  api?: WellbeingQuestionsApi;
  /** After Send or Skip removes the card, so the caller can place the focus. */
  onFinished?: () => void;
}

const isFeeling = (value: string): value is WellbeingFeeling =>
  WELLBEING_OPTIONS.some((o) => o.value === value);

/**
 * E35 W5: two optional questions under a finished check-in, at most once a quarter (the server
 * decides with `due`). Loads after the summary and never holds it up: while loading, on a failed
 * load or when not due, it shows nothing. The words are the same whatever any figure did, and it
 * carries no figure, score or comparison (O7, M5). Send with nothing chosen counts as a skip.
 */
export const WellbeingQuestions: FC<WellbeingQuestionsProps> = ({
  api = wellbeingQuestionsApi,
  onFinished,
}) => {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [feeling, setFeeling] = useState<WellbeingFeeling | null>(null);
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api.loadStatus(controller.signal).then(
      (due) => {
        if (!controller.signal.aborted) setPhase(due ? "asking" : "closed");
      },
      () => {
        if (!controller.signal.aborted) setPhase("closed");
      },
    );
    return () => controller.abort();
  }, [api]);

  const submit = async (skip: boolean) => {
    if (phase !== "asking") return;
    const answer = skip ? { feeling: null, worseText: null } : wellbeingAnswer(feeling, text);
    const isSkip = answer.feeling === null && answer.worseText === null;
    setPhase("sending");
    setFailed(false);
    try {
      await api.send(answer);
      setPhase(isSkip ? "closed" : "thanked");
      onFinished?.();
    } catch {
      setFailed(true);
      setPhase("asking");
    }
  };

  const showCard = phase === "asking" || phase === "sending";
  const sending = phase === "sending";

  return (
    <>
      {/* Mounted from the start, so the thank-you is heard when it is put in. */}
      <p
        className={questionsThanks()}
        data-testid="wellbeing-thanks"
        id="wellbeing-thanks"
        role="status"
      >
        {phase === "thanked" ? WELLBEING_COPY.thanks : null}
      </p>
      {showCard ? (
        <section
          aria-labelledby="wellbeing-heading"
          className={questionsCard()}
          data-testid="wellbeing-questions"
          id="wellbeing-questions"
        >
          <h4 className={questionsHeading()} id="wellbeing-heading">
            {WELLBEING_COPY.heading}
          </h4>
          <RadioCardGroup
            id="wellbeing-feeling"
            legend={WELLBEING_COPY.feelingLegend}
            onValueChange={(v) => setFeeling(isFeeling(v) ? v : null)}
            options={WELLBEING_OPTIONS}
            value={feeling ?? ""}
          />
          <FormField
            hint={WELLBEING_COPY.worseHint}
            id="wellbeing-worse-text"
            label={WELLBEING_COPY.worseLabel}
          >
            {(field) => (
              <textarea
                aria-describedby={field.describedBy}
                className={worseTextArea()}
                data-testid="wellbeing-worse-text"
                id={field.id}
                maxLength={WELLBEING_TEXT_MAX_LENGTH}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                value={text}
              />
            )}
          </FormField>
          {failed ? (
            <InlineAlert data-testid="wellbeing-error" id="wellbeing-error" tone="danger">
              {WELLBEING_COPY.error}
            </InlineAlert>
          ) : null}
          <div className={questionsActions()}>
            <Button
              aria-disabled={sending || undefined}
              data-testid="wellbeing-send"
              id="wellbeing-send"
              onClick={() => void submit(false)}
              size="sm"
              type="button"
            >
              {WELLBEING_COPY.send}
            </Button>
            <Button
              aria-disabled={sending || undefined}
              data-testid="wellbeing-skip"
              id="wellbeing-skip"
              onClick={() => void submit(true)}
              size="sm"
              type="button"
              variant="secondary"
            >
              {WELLBEING_COPY.skip}
            </Button>
          </div>
        </section>
      ) : null}
    </>
  );
};

export default WellbeingQuestions;
