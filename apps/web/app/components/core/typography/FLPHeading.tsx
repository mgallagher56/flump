import { css } from "@repo/ui/styled-system/css";
import type { FC, HTMLAttributes } from "react";

interface FLPHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  color?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  mt?: number | string;
  mb?: number | string;
}

const FLPHeading: FC<FLPHeadingProps> = ({
  as: Component = "h2",
  color = "primary",
  size = "md",
  mt,
  mb,
  style,
  className,
  children,
  ...props
}) => {
  const sizeMap = {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.25rem",
    xl: "1.5rem",
    "2xl": "1.875rem",
    "3xl": "2.25rem",
    "4xl": "3rem",
  };

  const headingStyle = css({
    color: color === "blue.500" ? "primary" : color,
    fontSize: sizeMap[size],
    fontWeight: "bold",
    marginTop: mt,
    marginBottom: mb,
    lineHeight: "tight",
    margin: 0,
  });

  return (
    <Component className={`${headingStyle} ${className || ""}`} style={style} {...props}>
      {children}
    </Component>
  );
};

export default FLPHeading;
