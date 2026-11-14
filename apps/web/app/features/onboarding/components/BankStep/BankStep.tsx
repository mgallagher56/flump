import { EmptyState, Illustration, StatusBadge } from "@repo/ui";
import type { FC } from "react";
import { StepFrame } from "../StepFrame";
import { bankStepRecipe } from "./BankStep.styles";

export interface BankStepProps {
  onBack: () => void;
  onNext: () => void;
  focusOnMount?: boolean;
}

/**
 * Optional by design (E6): nothing here connects a bank and there is nothing to fill in, so the
 * step has Next only (no skip to compete with it) and no figure depends on it.
 */
export const BankStep: FC<BankStepProps> = ({ onBack, onNext, focusOnMount }) => {
  const classes = bankStepRecipe();
  return (
    <StepFrame
      focusOnMount={focusOnMount}
      id="bank"
      onBack={onBack}
      onNext={onNext}
      title="Bank connection"
    >
      <StatusBadge className={classes.badge} variant="neutral">
        Optional
      </StatusBadge>
      <EmptyState
        description="Setup works with the figures you have entered. Afterwards you can add accounts by hand on the accounts page."
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
