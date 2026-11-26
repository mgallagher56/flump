import type { ConfirmDialogProps } from "./ConfirmDialog";

const noop = () => {};

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const confirmDialogStates = {
  destructive: {
    visible: true,
    title: "Delete this account?",
    message: "Its balance and history are removed. This cannot be undone.",
    confirmLabel: "Delete account",
    onConfirm: noop,
    onCancel: noop,
  },
  signOut: {
    visible: true,
    title: "Sign out of Flump?",
    message: "This removes your sign-in from this phone. Your data stays in your Flump account.",
    confirmLabel: "Sign out",
    tone: "default",
    onConfirm: noop,
    onCancel: noop,
  },
} satisfies Record<string, ConfirmDialogProps>;
