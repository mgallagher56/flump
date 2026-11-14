import { Button, Heading, Icon, Text } from "@repo/ui";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { type FC, type ReactNode, useEffect } from "react";
import { stepFrameRecipe } from "./StepFrame.styles";

export interface StepFrameProps {
  /** Used for ids: `onboarding-step-<id>`. */
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  onBack?: () => void;
  /**
   * Optional steps only: shows "Skip this step" as a text link under the actions, which moves on
   * and keeps anything already entered. Never given on a required step.
   */
  onSkip?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  /** Move focus to the heading when the step appears (not on first load). */
  focusOnMount?: boolean;
}

export const StepFrame: FC<StepFrameProps> = ({
  id,
  title,
  description,
  children,
  onBack,
  onSkip,
  onNext,
  nextLabel = "Next",
  focusOnMount = false,
}) => {
  const classes = stepFrameRecipe();
  useEffect(() => {
    if (focusOnMount) document.getElementById(`onboarding-step-${id}-title`)?.focus();
  }, []);

  return (
    <section
      aria-labelledby={`onboarding-step-${id}-title`}
      className={classes.root}
      data-testid={`onboarding-step-${id}`}
      id={`onboarding-step-${id}`}
    >
      <div className={classes.heading}>
        <Heading as="h2" id={`onboarding-step-${id}-title`} size="md" tabIndex={-1}>
          {title}
        </Heading>
        {description ? (
          <Text color="secondary" textStyle="body.sm">
            {description}
          </Text>
        ) : null}
      </div>
      <div className={classes.fields}>{children}</div>
      <div className={classes.actions}>
        {onBack ? (
          <Button onClick={onBack} size="sm" type="button" variant="ghost">
            <Icon icon={ArrowLeft} size="sm" /> Back
          </Button>
        ) : (
          <span />
        )}
        {onNext ? (
          <Button onClick={onNext} type="button">
            {nextLabel} <Icon icon={ArrowRight} size="sm" />
          </Button>
        ) : null}
      </div>
      {onSkip ? (
        <div className={classes.skip}>
          <Button onClick={onSkip} size="sm" type="button" variant="link">
            Skip this step
          </Button>
        </div>
      ) : null}
    </section>
  );
};
