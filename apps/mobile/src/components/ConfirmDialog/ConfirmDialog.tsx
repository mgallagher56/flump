import { useEffect, useRef } from "react";
import { Alert } from "react-native";

export interface ConfirmDialogProps {
  /** Shows the dialog while true. The parent sets it false in `onConfirm` and `onCancel`. */
  visible: boolean;
  /** Names the thing ("Sign out of Flump?"). */
  title: string;
  /** The consequence, in plain words. */
  message: string;
  /** Says what the button does ("Sign out"), never "OK" or "Yes". */
  confirmLabel: string;
  /** Defaults to "Cancel". */
  cancelLabel?: string;
  /** `destructive` gives the button the platform's destructive role. Defaults to `destructive`. */
  tone?: "destructive" | "default";
  onConfirm(): void;
  onCancel(): void;
}

/**
 * The confirmation before an action that is hard to undo, as the platform's own alert (plan
 * section 2; CROSS-PLATFORM section 4): title, consequence, Cancel and a button that says what it
 * does, in the platform's order. Renders nothing itself. Android's back button or a tap outside
 * counts as Cancel.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "destructive",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // The latest handlers, so a re-render while the alert is open does not show it again.
  const handlers = useRef({ onConfirm, onCancel });
  handlers.current = { onConfirm, onCancel };
  useEffect(() => {
    if (!visible) return;
    // One answer per showing: a second callback (dismiss after a press) is ignored.
    let answered = false;
    const answer = (confirmed: boolean) => {
      if (answered) return;
      answered = true;
      if (confirmed) handlers.current.onConfirm();
      else handlers.current.onCancel();
    };
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => answer(false) },
        { text: confirmLabel, style: tone, onPress: () => answer(true) },
      ],
      { cancelable: true, onDismiss: () => answer(false) },
    );
  }, [visible, title, message, confirmLabel, cancelLabel, tone]);
  return null;
}
