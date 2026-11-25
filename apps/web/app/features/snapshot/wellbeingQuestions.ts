import {
  type AnswerWellbeingQuestionsRequest,
  AnswerWellbeingQuestionsResponse,
  WELLBEING_TEXT_MAX_LENGTH,
  type WellbeingFeeling,
  WellbeingQuestionsStatusResponse,
} from "@flump/api-contract";
import { apiFetch } from "~/services/api-client";

/**
 * E35 W5: the two optional questions after a check-in. The words are fixed: the same whatever any
 * figure did, with no figure, score or comparison (copy guide 2.5, UX O7 and M5).
 */
export const WELLBEING_COPY = {
  heading: "Two optional questions",
  feelingLegend: "After this check-in, how do you feel about your money?",
  worseLabel: "Did anything here make you feel worse? Tell us what.",
  worseHint: "Please leave out health details and anything else sensitive. We read every answer.",
  send: "Send answers",
  skip: "Skip",
  thanks: "Thank you for your answers.",
  error: "We could not send that. Nothing was saved. Try again.",
} as const;

/** The three answers, in the order shown. Equal weight: no option is marked as better. */
export const WELLBEING_OPTIONS: readonly { value: WellbeingFeeling; label: string }[] = [
  { value: "more_in_control", label: "More in control" },
  { value: "about_the_same", label: "About the same" },
  { value: "more_worried", label: "More worried" },
];

export { WELLBEING_TEXT_MAX_LENGTH };

/** What is sent: the text trimmed, and an empty text or no choice sent as null. Both null is a skip. */
export function wellbeingAnswer(
  feeling: WellbeingFeeling | null,
  worseText: string,
): AnswerWellbeingQuestionsRequest {
  const text = worseText.trim().slice(0, WELLBEING_TEXT_MAX_LENGTH);
  return { feeling, worseText: text === "" ? null : text };
}

/** The calls the questions make; tests and stories pass their own. */
export interface WellbeingQuestionsApi {
  /** Whether to ask after this check-in. */
  loadStatus: (signal: AbortSignal) => Promise<boolean>;
  /** Records the answer, or a skip (both null). Rejects when it was not sent. */
  send: (answer: AnswerWellbeingQuestionsRequest) => Promise<void>;
}

export const wellbeingQuestionsApi: WellbeingQuestionsApi = {
  loadStatus: async (signal) => {
    const status = await apiFetch("/snapshots/wellbeing-questions", {
      schema: WellbeingQuestionsStatusResponse,
      signal,
      // A slow answer shows nothing rather than a card that appears long after the summary.
      timeoutMs: 5000,
    });
    return status.due;
  },
  send: async (answer) => {
    await apiFetch("/snapshots/wellbeing-questions", {
      method: "POST",
      body: answer,
      schema: AnswerWellbeingQuestionsResponse,
      // Not a create: the first record of a quarter stands, and no copy of the text is kept for a
      // replay.
      idempotencyKey: false,
    });
  },
};
