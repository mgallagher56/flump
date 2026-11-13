import { Money } from "@repo/ui";
import type { FC } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import { notSetLink } from "./NotSetValue.styles";

export interface NotSetValueProps {
  /** Where the user can supply the missing value. */
  href: string;
  /** What is missing, e.g. "income". Makes the link name unique: "Add income". */
  subject: string;
  /** Verb in the link text. Defaults to "Add". */
  actionLabel?: string;
  /** The unknown-value text. Defaults to "Not set". */
  label?: string;
  /** Link id. */
  id?: string;
  size?: "sm" | "md";
}

/**
 * Compact "unknown value" state for dashboard widgets: the shared `Money` "Not set" rendering
 * (never a zero, D16) with a link to where the value can be supplied.
 */
export const NotSetValue: FC<NotSetValueProps> = ({
  href,
  subject,
  actionLabel = "Add",
  label = "Not set",
  id,
  size = "sm",
}) => (
  <Money
    notSetAction={
      <SampleAwareLink className={notSetLink()} id={id} to={href}>
        {`${actionLabel} ${subject}`}
      </SampleAwareLink>
    }
    notSetLabel={label}
    size={size}
    value={null}
  />
);

export default NotSetValue;
