import { Button } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import type { BackendErrorKind } from "../../../../services/backend-error";
import {
  errorStateActions,
  errorStateBadge,
  errorStateBody,
  errorStateContainer,
  errorStateHeading,
} from "./RouteErrorState.styles";

export interface RouteErrorStateProps {
  kind: BackendErrorKind | "unknown";
  onRetry?: () => void;
  retrying?: boolean;
  primaryHref?: string;
  primaryLabel?: string;
  /** Where the 'Sign in again' form posts. Defaults to '/logout'. */
  signInAction?: string;
  className?: string;
}

interface Copy {
  badge: string;
  heading: string;
  body: string;
}

const GENERIC: Copy = {
  badge: "Something went wrong",
  heading: "We couldn't load your data",
  body: "This is usually temporary. Try again in a moment, and your figures will be back.",
};

function copyFor(kind: RouteErrorStateProps["kind"]): Copy {
  switch (kind) {
    case "unauthorised":
      return {
        badge: "Signed out",
        heading: "Your session has ended",
        body: "For your security you've been signed out. Sign in again to carry on where you left off.",
      };
    case "forbidden":
      return {
        badge: "No access",
        heading: "You don't have access to this",
        body: "Your account can't open this page. If you think that's wrong, contact support.",
      };
    case "not-invited":
      return {
        badge: "Invite only",
        heading: "Flump is invite-only for now",
        body: "You're signed in, but this account hasn't been invited to the beta yet. Sign out and use an invited account, or ask the person who invited you.",
      };
    case "not-found":
      return {
        badge: "Not found",
        heading: "We couldn't find that",
        body: "It may have been removed, or the link may be out of date.",
      };
    default:
      return GENERIC;
  }
}

export const RouteErrorState: FC<RouteErrorStateProps> = ({
  kind,
  onRetry,
  retrying = false,
  primaryHref,
  primaryLabel = "Go back",
  signInAction = "/logout",
  className,
}) => {
  const copy = copyFor(kind);
  const showRetry =
    kind !== "unauthorised" &&
    kind !== "forbidden" &&
    kind !== "not-found" &&
    kind !== "not-invited";

  return (
    <section className={cx(errorStateContainer(), className)} role="alert" id="route-error-state">
      <span className={errorStateBadge()}>{copy.badge}</span>
      <h2 className={errorStateHeading()}>{copy.heading}</h2>
      <p className={errorStateBody()}>{copy.body}</p>
      <div className={errorStateActions()}>
        {kind === "unauthorised" ? (
          <form method="post" action={signInAction}>
            <Button type="submit" variant="primary">
              Sign in again
            </Button>
          </form>
        ) : null}
        {kind === "not-invited" ? (
          <form method="post" action={signInAction}>
            <Button type="submit" variant="primary">
              Sign out
            </Button>
          </form>
        ) : null}
        {showRetry && onRetry ? (
          <Button type="button" variant="primary" onClick={onRetry} disabled={retrying}>
            {retrying ? "Trying again..." : "Try again"}
          </Button>
        ) : null}
        {primaryHref ? (
          <Button asChild variant="outline">
            <a href={primaryHref}>{primaryLabel}</a>
          </Button>
        ) : null}
      </div>
    </section>
  );
};
