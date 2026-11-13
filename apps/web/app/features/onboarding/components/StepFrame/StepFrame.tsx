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
  /** Shows "Skip for now", which moves on and keeps anything already entered on this step. */
  onSkip?: () => void;
  /** Draws "Skip for now" as the primary button, for optional steps where skipping is the usual path. */
  skipPrimary?: boolean;
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
  skipPrimary = false,
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
        <div className={classes.actionsEnd}>
          {onSkip ? (
            <Button onClick={onSkip} type="button" variant={skipPrimary ? "primary" : "outline"}>
              Skip for now
            </Button>
          ) : null}
          {onNext ? (
            <Button onClick={onNext} type="button">
              {nextLabel} <Icon icon={ArrowRight} size="sm" />
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
};
