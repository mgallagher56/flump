import { createElement, type FC, type ReactNode } from "react";
import { emptyStateRecipe } from "./EmptyState.styles";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Decorative artwork, always hidden from assistive technology. */
  illustration?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  headingLevel?: "h2" | "h3";
  /** `muted` drops the tinted fill for places where the empty state should recede. */
  tone?: "default" | "muted";
  size?: "md" | "sm";
  id?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  illustration,
  action,
  secondaryAction,
  headingLevel = "h2",
  tone = "default",
  size = "md",
  id = "empty-state",
}) => {
  const classes = emptyStateRecipe({ tone, size });

  return (
    <section id={id} data-testid={id} className={classes.root} aria-labelledby={`${id}-title`}>
      {illustration ? (
        <div
          id={`${id}-illustration`}
          data-testid={`${id}-illustration`}
          className={classes.illustration}
          aria-hidden="true"
        >
          {illustration}
        </div>
      ) : null}
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
      {action || secondaryAction ? (
        <div id={`${id}-action`} data-testid={`${id}-action`} className={classes.action}>
          {action}
          {secondaryAction ? (
            <div
              id={`${id}-secondary-action`}
              data-testid={`${id}-secondary-action`}
              className={classes.secondaryAction}
            >
              {secondaryAction}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default EmptyState;
