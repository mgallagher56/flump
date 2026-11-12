import type { FC } from "react";
import { notSetAction, notSetLabel, notSetWrapper } from "./NotSet.styles";

export interface NotSetProps {
  /** Where the user can supply the missing value. */
  href: string;
  /** Link text, e.g. "Add salary". */
  actionLabel?: string;
  /** The unknown-value text. Defaults to "Not set". */
  label?: string;
}

/**
 * Interim "unknown value" display: text plus a plain link to where it can be set.
 * Superseded by the shared Money "Not set" state (E15 T2.3); uses a plain anchor so it works
 * outside a router in unit tests.
 */
export const NotSet: FC<NotSetProps> = ({ href, actionLabel = "Add", label = "Not set" }) => (
  <span className={notSetWrapper()}>
    <span className={notSetLabel()}>{label}</span>
    <a className={notSetAction()} href={href}>
      {actionLabel}
    </a>
  </span>
);

export default NotSet;
