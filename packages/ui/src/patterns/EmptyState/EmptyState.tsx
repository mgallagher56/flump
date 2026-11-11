import { createElement, type FC, type ReactNode } from "react";
import { emptyStateRecipe } from "./EmptyState.styles";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  headingLevel?: "h2" | "h3";
  id?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  headingLevel = "h2",
  id = "empty-state",
}) => {
  const classes = emptyStateRecipe();

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
      {action ? (
        <div id={`${id}-action`} data-testid={`${id}-action`} className={classes.action}>
          {action}
        </div>
      ) : null}
    </section>
  );
};

export default EmptyState;
