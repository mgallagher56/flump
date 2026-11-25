import { Button, ConfirmDialog } from "@repo/ui";
import { type FC, useState } from "react";
import { leaveRoot, leaveText } from "./LeaveHouseholdSection.styles";

export const LEAVE_LINE =
  "Leave now. Nothing of yours is deleted. Flump does not tell the other person.";

export interface LeaveHouseholdSectionProps {
  pending: boolean;
  error: string | null;
  /** Leaves at once. No reason, approval or notice from anyone (CD6, G5). */
  onConfirm: () => void;
}

/**
 * How to leave, right under who the household is with. One check that the press was meant, then
 * the person leaves alone and at once; nobody else is asked and nobody is told.
 */
export const LeaveHouseholdSection: FC<LeaveHouseholdSectionProps> = ({
  pending,
  error,
  onConfirm,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={leaveRoot()} id="household-leave" data-testid="household-leave">
      <p className={leaveText()}>{LEAVE_LINE}</p>
      <div>
        <Button size="sm" type="button" variant="outline" onClick={() => setOpen(true)}>
          Leave household
        </Button>
      </div>
      <ConfirmDialog
        cancelLabel="Stay"
        confirmLabel="Leave household"
        description="You leave straight away. Nothing of yours is deleted, and Flump does not tell the other person."
        error={error}
        id="household-leave-dialog"
        open={open}
        pending={pending}
        pendingLabel="Leaving"
        scope="single"
        title="Leave the household?"
        onConfirm={onConfirm}
        onOpenChange={setOpen}
      />
    </div>
  );
};

export default LeaveHouseholdSection;
