import { ConfirmDialog } from "@repo/ui";
import type { FC } from "react";

export interface UnsavedChangesDialogProps {
  open: boolean;
  /** The person chose to leave and lose their edits. */
  onDiscard: () => void;
  /** The person chose to carry on editing. */
  onKeepEditing: () => void;
}

/** Confirmation shown when leaving a settings tab or page with unsaved edits (E15 I-14). */
export const UnsavedChangesDialog: FC<UnsavedChangesDialogProps> = ({
  open,
  onDiscard,
  onKeepEditing,
}) => (
  <ConfirmDialog
    id="unsaved-changes-dialog"
    open={open}
    onOpenChange={(next) => {
      if (!next) onKeepEditing();
    }}
    title="Discard unsaved changes?"
    description="Your changes on this tab are not saved. If you leave now, they are lost."
    cancelLabel="Keep editing"
    confirmLabel="Discard changes"
    tone="danger"
    onConfirm={onDiscard}
  />
);
