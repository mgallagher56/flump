import { EmptyState, Illustration, StatusBadge } from "@repo/ui";
import type { FC } from "react";
import { StepFrame } from "../StepFrame";
import { bankStepRecipe } from "./BankStep.styles";

export interface BankStepProps {
  onBack: () => void;
  onSkip: () => void;
  focusOnMount?: boolean;
}

/**
 * Optional by design (E6): nothing here connects a bank. It only says that you can later, so
 * skipping is the main path and no figure depends on it.
 */
export const BankStep: FC<BankStepProps> = ({ onBack, onSkip, focusOnMount }) => {
  const classes = bankStepRecipe();
  return (
    <StepFrame
      focusOnMount={focusOnMount}
      id="bank"
      onBack={onBack}
      onSkip={onSkip}
      skipPrimary
      title="Bank connection"
    >
      <StatusBadge className={classes.badge} variant="neutral">
        Optional
      </StatusBadge>
      <EmptyState
        description="Everything in setup works with the numbers you have entered. When setup is done you can add accounts by hand, or connect a bank from Accounts where that is available."
        headingLevel="h3"
        id="onboarding-bank-empty"
        illustration={<Illustration scene="empty-accounts" size="sm" />}
        size="sm"
        title="No bank connected"
        tone="muted"
      />
    </StepFrame>
  );
};
