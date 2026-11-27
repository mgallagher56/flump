import type { PhraseConfirmProps } from "./PhraseConfirm";

const base = {
  phrase: "DELETE",
  label: "Type DELETE to confirm",
  confirmLabel: "Delete my account",
  pendingLabel: "Deleting",
  onConfirm: () => undefined,
} satisfies PhraseConfirmProps;

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const phraseConfirmStates = {
  empty: base,
  sending: { ...base, pending: true },
  recentSignInNeeded: {
    ...base,
    message: { text: "For your security, sign in again, then try again.", tone: "danger" },
    action: { label: "Sign in again", onPress: () => undefined },
  },
  finishing: {
    ...base,
    confirmLabel: "Remove my login",
    pendingLabel: "Removing",
    message: { text: "We still could not remove your login. Try again.", tone: "danger" },
  },
} satisfies Record<string, PhraseConfirmProps>;
