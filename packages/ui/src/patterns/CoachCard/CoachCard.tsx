import { X } from "lucide-react";
import { createElement, type FC, type ReactNode } from "react";
import { Icon } from "../../primitives/Icon/Icon";
import { coachCardRecipe } from "./CoachCard.styles";

export interface CoachCardProps {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  /** When provided, a labelled dismiss button is rendered. */
  onDismiss?: () => void;
  dismissLabel?: string;
  icon?: ReactNode;
  /** Pick the level that fits the page outline; there is deliberately no default. */
  headingLevel: "h2" | "h3" | "h4";
  id?: string;
}

/** The quiet "next best step" banner. A named region so assistive tech can jump to it. */
export const CoachCard: FC<CoachCardProps> = ({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  onDismiss,
  dismissLabel = "Dismiss",
  icon,
  headingLevel,
  id = "coach-card",
}) => {
  const classes = coachCardRecipe();

  return (
    <section id={id} data-testid={id} className={classes.root} aria-labelledby={`${id}-title`}>
      {icon ? (
        <div
          id={`${id}-icon`}
          data-testid={`${id}-icon`}
          className={classes.icon}
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      <div className={classes.body}>
        {eyebrow ? (
          <p id={`${id}-eyebrow`} data-testid={`${id}-eyebrow`} className={classes.eyebrow}>
            {eyebrow}
          </p>
        ) : null}
        {createElement(
          headingLevel,
          { id: `${id}-title`, "data-testid": `${id}-title`, className: classes.title },
          title,
        )}
        {description ? (
          <p
            id={`${id}-description`}
            data-testid={`${id}-description`}
            className={classes.description}
          >
            {description}
          </p>
        ) : null}
        <div id={`${id}-actions`} data-testid={`${id}-actions`} className={classes.actions}>
          {primaryAction}
          {secondaryAction}
        </div>
      </div>
      {onDismiss ? (
        <button
          id={`${id}-dismiss`}
          data-testid={`${id}-dismiss`}
          type="button"
          className={classes.dismiss}
          aria-label={dismissLabel}
          onClick={onDismiss}
        >
          <Icon icon={X} size="sm" />
        </button>
      ) : null}
    </section>
  );
};

export default CoachCard;
