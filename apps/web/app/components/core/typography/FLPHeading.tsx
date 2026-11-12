import { css } from "@repo/ui/styled-system/css";
import type { FC, HTMLAttributes } from "react";
import { useResponsive } from "~/context/ResponsiveContext";

export interface FLPHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";
  color?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  mt?: number | string;
  mb?: number | string;
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

const FLPHeading: FC<FLPHeadingProps> = ({
  as: Component = "h2",
  color = "text.primary",
  size = "md",
  mt,
  mb,
  style,
  className,
  isMobile: propIsMobile,
  variant = "desktop",
  children,
  ...props
}) => {
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);

  const sizeMap = {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: isMobileVariant ? "1.125rem" : "1.25rem",
    xl: isMobileVariant ? "1.25rem" : "1.5rem",
    "2xl": isMobileVariant ? "1.5rem" : "1.875rem",
    "3xl": isMobileVariant ? "1.75rem" : "2.25rem",
    "4xl": isMobileVariant ? "2rem" : "3rem",
  };

  const resolvedColor = color;

  const headingStyle = css({
    color: resolvedColor,
    fontFamily: "var(--fonts-display, 'Plus Jakarta Sans', sans-serif)",
    letterSpacing: "-0.025em",
    fontSize: sizeMap[size],
    fontWeight: "bold",
    marginTop: mt,
    marginBottom: mb,
    lineHeight: "tight",
    margin: 0,
  });

  const mergedStyle = {
    fontSize: sizeMap[size],
    ...(mt !== undefined ? { marginTop: typeof mt === "number" ? `${mt * 4}px` : mt } : {}),
    ...(mb !== undefined ? { marginBottom: typeof mb === "number" ? `${mb * 4}px` : mb } : {}),
    ...style,
  };

  return (
    <Component className={`${headingStyle} ${className || ""}`} style={mergedStyle} {...props}>
      {children}
    </Component>
  );
};

export default FLPHeading;
