import { createElement, type FC, type ReactNode } from "react";
import { Illustration } from "../../primitives/Illustration/Illustration";
import type { DocumentScene } from "../../primitives/Illustration/Illustration.documents";
import { emptyStateRecipe } from "./EmptyState.styles";

const PROTO_EMPTY_SCENES: readonly DocumentScene[] = [
  "empty-accounts",
  "empty-goals",
  "empty-savings",
  "empty-debt",
  "empty-pension",
  "onboarding",
];

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Decorative artwork, always hidden from assistive technology. */
  illustration?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  /** `h1` only where the empty state replaces the whole page, so it is the page heading. */
  headingLevel?: "h1" | "h2" | "h3";
  /**
   * `default` is a sunken panel. `muted` drops the tinted fill for places where the empty
   * state should recede. `card` sits on the card surface with a hairline border, for an empty state
   * that is the whole page (an opt-in screen), so it reads as content rather than a hole.
   */
  tone?: "default" | "muted" | "card";
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
      ) : (
        // PROTOTYPE ONLY (app design prototypes branch, never merged): the page's document picture,
        // chosen by the prototype CSS from the page's area, shown only at levels 1 to 3.
        <div
          aria-hidden="true"
          className={classes.illustration}
          data-proto-empty-art=""
          style={{ display: "none" }}
        >
          {PROTO_EMPTY_SCENES.map((scene) => (
            <span data-proto-scene={scene} key={scene}>
              <Illustration scene={scene} size="md" variant="document" />
            </span>
          ))}
        </div>
      )}
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
