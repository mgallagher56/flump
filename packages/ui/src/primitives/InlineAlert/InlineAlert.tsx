import {
  CircleAlert,
  CircleCheck,
  Info,
  type LucideIcon,
  MessageSquare,
  TriangleAlert,
  X,
} from "lucide-react";
import type { FC, HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon";
import { VisuallyHidden } from "../VisuallyHidden";
import {
  inlineAlertActionRecipe,
  inlineAlertBody,
  inlineAlertDismissRecipe,
  inlineAlertIconRecipe,
  inlineAlertRecipe,
  inlineAlertText,
  inlineAlertTitle,
} from "./InlineAlert.styles";

export type InlineAlertTone = "info" | "positive" | "warning" | "danger" | "neutral";

/** Icon plus words per tone, so meaning never rests on colour alone. */
export const INLINE_ALERT_TONE_META: Record<InlineAlertTone, { icon: LucideIcon; label: string }> =
  {
    info: { icon: Info, label: "Information" },
    positive: { icon: CircleCheck, label: "Success" },
    warning: { icon: TriangleAlert, label: "Warning" },
    danger: { icon: CircleAlert, label: "Error" },
    neutral: { icon: MessageSquare, label: "Note" },
  };

export interface InlineAlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: InlineAlertTone;
  /** `banner` is the full-width band variant. */
  layout?: "inline" | "banner";
  title?: ReactNode;
  /** Body copy. */
  children?: ReactNode;
  /** Optional action, usually a `Button` (size sm) or a link. */
  action?: ReactNode;
  /** Renders a dismiss button when provided. */
  onDismiss?: () => void;
  dismissLabel?: string;
}

/**
 * Errors (`danger`) use role="alert"; every other tone uses role="status". A visually hidden tone
 * word ("Error", "Warning"...) precedes the text for screen readers; sighted users get the icon.
 */
export const InlineAlert: FC<InlineAlertProps> = ({
  tone = "info",
  layout = "inline",
  title,
  children,
  action,
  onDismiss,
  dismissLabel = "Dismiss",
  className,
  ...props
}) => {
  const meta = INLINE_ALERT_TONE_META[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cx(inlineAlertRecipe({ tone, layout }), className)}
      {...props}
    >
      <span className={inlineAlertIconRecipe({ tone })}>
        <Icon icon={meta.icon} size="md" />
      </span>
      <div className={inlineAlertBody()}>
        <VisuallyHidden>{meta.label}: </VisuallyHidden>
        {title ? <p className={inlineAlertTitle()}>{title}</p> : null}
        {children ? <div className={inlineAlertText()}>{children}</div> : null}
        {action ? <div className={inlineAlertActionRecipe()}>{action}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          aria-label={dismissLabel}
          className={inlineAlertDismissRecipe()}
          onClick={onDismiss}
        >
          <Icon icon={X} size="sm" />
        </button>
      ) : null}
    </div>
  );
};

/** Full-width variant of `InlineAlert`. */
export const Banner: FC<Omit<InlineAlertProps, "layout">> = (props) => (
  <InlineAlert {...props} layout="banner" />
);

export default InlineAlert;
