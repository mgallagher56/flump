import { type FC, useId } from "react";
import { Link, useInRouterContext } from "react-router";
import { notSetAction, notSetLabel, notSetWrapper } from "./NotSet.styles";

export interface NotSetProps {
  /** Where the user can supply the missing value. */
  href: string;
  /** What is missing, e.g. "salary". Makes the link's name unique: "Add salary". */
  subject: string;
  /** Verb in the link text. Defaults to "Add". */
  actionLabel?: string;
  /** The unknown-value text. Defaults to "Not set". */
  label?: string;
  /** Link id. Defaults to a generated one. */
  id?: string;
}

/**
 * Interim "unknown value" display: text plus a link to where it can be set. Uses the router
 * Link inside a router and a plain anchor outside (unit tests). Superseded by the shared Money
 * "Not set" state (E15 T2.3).
 */
export const NotSet: FC<NotSetProps> = ({
  href,
  subject,
  actionLabel = "Add",
  label = "Not set",
  id,
}) => {
  const generatedId = useId();
  const inRouter = useInRouterContext();
  const linkId = id ?? `not-set-${generatedId}`;
  const text = `${actionLabel} ${subject}`;

  return (
    <span className={notSetWrapper()}>
      <span className={notSetLabel()}>{label}</span>
      {inRouter ? (
        <Link className={notSetAction()} id={linkId} to={href}>
          {text}
        </Link>
      ) : (
        <a className={notSetAction()} href={href} id={linkId}>
          {text}
        </a>
      )}
    </span>
  );
};

export default NotSet;
