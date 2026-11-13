import { Button, Illustration, type IllustrationScene } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useRef } from "react";
import { APP_VERSION, feedbackMailto } from "~/utils/support";
import type { BackendErrorKind } from "../../../../services/backend-error";
import {
  errorStateActions,
  errorStateBadge,
  errorStateBody,
  errorStateContainer,
  errorStateHeading,
  errorStateIllustration,
  errorStateReport,
  errorStateStatus,
} from "./RouteErrorState.styles";

export interface RouteErrorStateProps {
  kind: BackendErrorKind | "unknown";
  onRetry?: () => void;
  retrying?: boolean;
  primaryHref?: string;
  primaryLabel?: string;
  /** Where the 'Sign in again' form posts. Defaults to '/logout'. */
  signInAction?: string;
  /** HTTP status shown subtly under the copy, when the failure had one. */
  status?: number;
  /** The root boundary has no page heading above it, so it renders the state as an h1. */
  headingLevel?: "h1" | "h2";
  /** Route identifier for the feedback subject. Never include account ids or amounts. */
  routeKey?: string;
  className?: string;
}

interface Copy {
  badge: string;
  heading: string;
  body: string;
  scene: IllustrationScene;
}

const GENERIC: Copy = {
  badge: "Something went wrong",
  heading: "We couldn't load your data",
  body: "Something went wrong on our side. Try again in a moment. If it keeps happening, report it and we'll look into it.",
  scene: "empty-accounts",
};

function copyFor(kind: RouteErrorStateProps["kind"]): Copy {
  switch (kind) {
    case "unauthorised":
      return {
        badge: "Signed out",
        heading: "Your session has ended",
        body: "For your security you've been signed out. Sign in again to carry on where you left off.",
        scene: "empty-accounts",
      };
    case "forbidden":
      return {
        badge: "No access",
        heading: "You don't have access to this",
        body: "Your account can't open this page. If you think that's wrong, contact support.",
        scene: "not-found",
      };
    case "not-invited":
      return {
        badge: "Invite only",
        heading: "Flump is invite-only for now",
        body: "You're signed in, but this account hasn't been invited to the beta yet. Sign out and use an invited account, or ask the person who invited you.",
        scene: "onboarding",
      };
    case "not-found":
      return {
        badge: "Not found",
        heading: "We couldn't find that",
        body: "The page may have moved, or the link may be out of date. Head back to Flump to carry on.",
        scene: "not-found",
      };
    case "unavailable":
      return {
        badge: "Connection problem",
        heading: "We couldn't reach Flump",
        body: "Check your connection, then try again. If you're online, we may be having a short outage.",
        scene: "empty-accounts",
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
  status,
  headingLevel = "h2",
  routeKey = "unknown",
  className,
}) => {
  const copy = copyFor(kind);
  const Heading = headingLevel;
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Move focus to the heading so keyboard and screen reader users land on what happened.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);
  const showRetry =
    kind !== "unauthorised" &&
    kind !== "forbidden" &&
    kind !== "not-found" &&
    kind !== "not-invited";

  return (
    <section className={cx(errorStateContainer(), className)} role="alert" id="route-error-state">
      <div className={errorStateIllustration()}>
        <Illustration scene={copy.scene} size="sm" />
      </div>
      <span className={errorStateBadge()}>{copy.badge}</span>
      <Heading ref={headingRef} className={errorStateHeading()} tabIndex={-1}>
        {copy.heading}
      </Heading>
      <p className={errorStateBody()}>{copy.body}</p>
      {status ? <p className={errorStateStatus()}>Error {status}</p> : null}
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
        {kind === "not-invited" || showRetry ? (
          <a
            aria-label="Report this problem by email"
            className={errorStateReport()}
            href={feedbackMailto(routeKey, APP_VERSION)}
          >
            Report this problem
          </a>
        ) : null}
      </div>
    </section>
  );
};
