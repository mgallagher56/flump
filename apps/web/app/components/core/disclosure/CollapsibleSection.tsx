import { css } from "@repo/ui/styled-system/css";
import { type FC, type ReactNode, useState } from "react";
import { FiChevronDown } from "react-icons/fi";

export interface CollapsibleSectionProps {
  title: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  subtitle?: string;
  className?: string;
}

export const CollapsibleSection: FC<CollapsibleSectionProps> = ({
  title,
  badge,
  defaultOpen = false,
  children,
  subtitle,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const containerStyle = css({
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface",
    overflow: "hidden",
    transition: "border-color 0.2s ease",
  });

  const headerButtonStyle = css({
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: { base: "14px 16px", md: "16px 20px" },
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: "background-color 0.15s ease",
    _hover: {
      backgroundColor: "surface.subtle",
    },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "primary",
      outlineOffset: "-2px",
    },
  });

  const titleRowStyle = css({
    display: "flex",
    alignItems: "center",
    gap: "10px",
  });

  const titleTextStyle = css({
    fontSize: "sm",
    fontWeight: "semibold",
    color: "text.primary",
  });

  const subtitleTextStyle = css({
    fontSize: "xs",
    color: "text.muted",
    marginTop: "2px",
  });

  const chevronStyle = css({
    fontSize: "16px",
    color: "text.muted",
    transition: "transform 0.2s ease",
    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
    flexShrink: 0,
  });

  const bodyStyle = css({
    padding: { base: "16px", md: "20px" },
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    backgroundColor: "surface",
  });

  return (
    <div className={`${containerStyle} ${className || ""}`.trim()}>
      <button
        aria-expanded={isOpen}
        className={headerButtonStyle}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div>
          <div className={titleRowStyle}>
            <span className={titleTextStyle}>{title}</span>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && <p className={subtitleTextStyle}>{subtitle}</p>}
        </div>
        <FiChevronDown className={chevronStyle} />
      </button>

      {isOpen && <div className={bodyStyle}>{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
