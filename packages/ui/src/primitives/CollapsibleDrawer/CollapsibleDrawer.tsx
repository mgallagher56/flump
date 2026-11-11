import { type FC, type ReactNode, useState } from "react";
import { css, cx } from "../../../styled-system/css";
import { drawerBody, drawerContainer, drawerHeaderButton } from "./CollapsibleDrawer.styles";

export interface CollapsibleDrawerProps {
  title: string;
  badge?: ReactNode;
  subtitle?: string;
  defaultOpen?: boolean;
  /**
   * Trailing action text while open. Defaults to "Hide Schedule ▲". When either
   * label is supplied the trailing text is a visual cue only (aria-hidden) and
   * `title` alone names the button.
   */
  openLabel?: string;
  /** Trailing action text while closed. Defaults to "View Full Schedule ▼". */
  closedLabel?: string;
  children: ReactNode;
  className?: string;
}

export const CollapsibleDrawer: FC<CollapsibleDrawerProps> = ({
  title,
  badge,
  subtitle,
  defaultOpen = false,
  openLabel,
  closedLabel,
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const customLabels = openLabel !== undefined || closedLabel !== undefined;

  return (
    <div className={cx(drawerContainer(), className)}>
      <button
        aria-expanded={isOpen}
        className={cx(drawerHeaderButton())}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              className={css({ fontSize: "sm", fontWeight: "semibold", color: "text.primary" })}
            >
              {title}
            </span>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className={css({ fontSize: "xs", color: "text.muted", mt: "2px", mb: "0" })}>
              {subtitle}
            </p>
          )}
        </div>

        <span
          aria-hidden={customLabels ? "true" : undefined}
          className={css({
            fontSize: "xs",
            fontWeight: "semibold",
            color: "primary",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          })}
        >
          {isOpen ? (openLabel ?? "Hide Schedule ▲") : (closedLabel ?? "View Full Schedule ▼")}
        </span>
      </button>

      {isOpen && <div className={cx(drawerBody())}>{children}</div>}
    </div>
  );
};

export default CollapsibleDrawer;
