import { Button, Illustration, type IllustrationScene } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useRef } from "react";
import { APP_VERSION, feedbackMailto } from "~/utils/support";
import type { BackendErrorKind } from "../../../../services/backend-error";
import {
  errorStateActions,
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
  heading: string;
  body: string;
  scene: IllustrationScene;
}

const GENERIC: Copy = {
  heading: "We could not load this page",
  body: "This is a problem on our side. Try again in a moment, or report it if it keeps happening.",
  scene: "empty-accounts",
};

function copyFor(kind: RouteErrorStateProps["kind"]): Copy {
  switch (kind) {
    case "unauthorised":
      return {
        heading: "Your session has ended",
        body: "For your security you've been signed out. Sign in again to carry on where you left off.",
        scene: "empty-accounts",
      };
    case "forbidden":
      return {
        heading: "You do not have access to this page",
        body: "Your account cannot open this page. If that looks wrong, contact support.",
        scene: "not-found",
      };
    case "not-invited":
      return {
        heading: "Flump is invite-only for now",
        body: "You are signed in, but this account has not been invited to the beta. Sign out and use an invited account, or ask the person who invited you.",
        scene: "onboarding",
      };
    case "not-found":
      return {
        heading: "We cannot find that page",
        body: "The page may have moved, or the link may be out of date.",
        scene: "not-found",
      };
    case "unavailable":
      return {
        heading: "We could not reach Flump",
        body: "Check your connection, then try again. If you are online, Flump may be down for a short time.",
        scene: "empty-accounts",
      };
    default:
      return GENERIC;
  }
}

/** React Router numbers history entries from 0; a later entry means the app navigated here. */
const cameFromInAppNavigation = (): boolean => {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === "number" && idx > 0;
};

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
  // After an in-app navigation, move focus to the heading so keyboard and screen reader users land
  // on what happened. Focus is the one announcement: the section is not also a live region, or the
  // error would be read twice. On a fresh page load the browser starts at the top, so focus stays
  // there and the first Tab still reaches the skip link.
  useEffect(() => {
    if (cameFromInAppNavigation()) headingRef.current?.focus({ preventScroll: true });
  }, []);
  const showRetry =
    kind !== "unauthorised" &&
    kind !== "forbidden" &&
    kind !== "not-found" &&
    kind !== "not-invited";

  return (
    <section className={cx(errorStateContainer(), className)} id="route-error-state">
      <div className={errorStateIllustration()}>
        <Illustration scene={copy.scene} size="sm" />
      </div>
      <Heading ref={headingRef} className={errorStateHeading()} tabIndex={-1}>
        {copy.heading}
      </Heading>
      <p className={errorStateBody()}>{copy.body}</p>
      {/* "Not found" is said once, by the heading; other failures keep their code for support. */}
      {status && kind !== "not-found" ? <p className={errorStateStatus()}>Error {status}</p> : null}
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
            {retrying ? "Trying again…" : "Try again"}
          </Button>
        ) : null}
        {/* One way back (P12.3): a retryable failure offers "Try again", and the header has Home. */}
        {primaryHref && !(showRetry && onRetry) ? (
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
