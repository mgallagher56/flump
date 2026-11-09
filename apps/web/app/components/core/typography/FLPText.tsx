import { css } from "@repo/ui/styled-system/css";
import type { FC, HTMLAttributes } from "react";
import { useResponsive } from "~/context/ResponsiveContext";

export interface FLPTextProps extends HTMLAttributes<HTMLParagraphElement> {
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  color?: string;
  textTransform?: "uppercase" | "lowercase" | "capitalize" | "none";
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

const FLPText: FC<FLPTextProps> = ({
  fontSize = "md",
  fontWeight = "normal",
  lineHeight = "normal",
  letterSpacing = "normal",
  color = "text.secondary",
  textTransform,
  style,
  className,
  isMobile: propIsMobile,
  variant = "desktop",
  children,
  ...props
}) => {
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);

  const textStyle = css({
    fontFamily: "var(--fonts-body, 'Inter', sans-serif)",
    fontSize: isMobileVariant && fontSize === "lg" ? "md" : fontSize,
    fontWeight,
    lineHeight: lineHeight === "normal" ? 1.6 : lineHeight,
    letterSpacing,
    color,
    textTransform,
    margin: 0,
  });

  return (
    <p className={`${textStyle} ${className || ""}`} style={style} {...props}>
      {children}
    </p>
  );
};

export default FLPText;
