import { cx } from "@repo/ui/styled-system/css";
import type { FC, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { useSampleMode } from "~/context/SampleModeContext";
import { disabledLink } from "./SampleAwareLink.styles";

export interface SampleAwareLinkProps extends Omit<LinkProps, "className"> {
  className?: string;
  /** Replaces the children when the sandbox disables the link. Defaults to the children. */
  sampleLabel?: ReactNode;
  /** Accessible name used while disabled; defaults to the visible text. */
  sampleAriaLabel?: string;
}

/** A router link that renders as a disabled "Sign up to open" item inside the signed-out sandbox. */
export const SampleAwareLink: FC<SampleAwareLinkProps> = ({
  sampleLabel,
  sampleAriaLabel,
  children,
  className,
  ...rest
}) => {
  const sample = useSampleMode();
  if (!sample) {
    return (
      <Link className={className} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button
      aria-label={sampleAriaLabel}
      className={cx(className, disabledLink())}
      data-sample-disabled="true"
      disabled
      title="Sign up to open"
      type="button"
    >
      {sampleLabel ?? children}
    </button>
  );
};
