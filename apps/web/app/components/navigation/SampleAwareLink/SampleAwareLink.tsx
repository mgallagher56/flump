import { Icon } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { Lock } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, type LinkProps } from "react-router";
import { useSampleMode } from "~/context/SampleModeContext";
import { disabledLink } from "./SampleAwareLink.styles";

export interface SampleAwareLinkProps extends Omit<LinkProps, "className"> {
  className?: string;
  /** Replaces the children when the sandbox disables the link. Defaults to "Sign up to open". */
  sampleLabel?: ReactNode;
  /** Accessible name used while disabled; defaults to the visible text. */
  sampleAriaLabel?: string;
}

const isPassthrough = (key: string) =>
  key === "id" ||
  key === "style" ||
  key.startsWith("data-") ||
  key.startsWith("aria-") ||
  /^on(Focus|Blur|Mouse|Pointer|Key)/.test(key);

/**
 * A router link that renders as a disabled "Sign up to open" item inside the signed-out sandbox.
 * The disabled form stays focusable with aria-disabled and a no-op activation, so keyboard and
 * screen reader users find it; the lock icon (not opacity) signals the state.
 */
export const SampleAwareLink = forwardRef<HTMLElement, SampleAwareLinkProps>(
  ({ sampleLabel, sampleAriaLabel, children, className, ...rest }, ref) => {
    const sample = useSampleMode();
    const { t } = useTranslation();
    if (!sample) {
      return (
        <Link ref={ref as React.Ref<HTMLAnchorElement>} className={className} {...rest}>
          {children}
        </Link>
      );
    }
    const passthrough = Object.fromEntries(Object.entries(rest).filter(([k]) => isPassthrough(k)));
    return (
      <button
        {...passthrough}
        ref={ref as React.Ref<HTMLButtonElement>}
        aria-disabled="true"
        aria-label={sampleAriaLabel ?? (passthrough["aria-label"] as string | undefined)}
        className={cx(className, disabledLink())}
        data-sample-disabled="true"
        title={t("signUpToOpen", "Sign up to open")}
        type="button"
        onClick={(event) => event.preventDefault()}
      >
        <Icon icon={Lock} size="sm" />
        {sampleLabel ?? t("signUpToOpen", "Sign up to open")}
      </button>
    );
  },
);
SampleAwareLink.displayName = "SampleAwareLink";
