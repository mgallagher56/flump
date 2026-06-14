import { css } from "@repo/ui/styled-system/css";
import type { FC, HTMLAttributes } from "react";

interface FLPTextProps extends HTMLAttributes<HTMLParagraphElement> {
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  color?: string;
  textTransform?: "uppercase" | "lowercase" | "capitalize" | "none";
}

const FLPText: FC<FLPTextProps> = ({
  fontSize = "md",
  fontWeight = "normal",
  lineHeight = "normal",
  letterSpacing = "normal",
  color,
  textTransform,
  style,
  className,
  children,
  ...props
}) => {
  const textStyle = css({
    fontSize: fontSize as any,
    fontWeight: fontWeight as any,
    lineHeight: lineHeight as any,
    letterSpacing: letterSpacing as any,
    color: color as any,
    textTransform: textTransform as any,
    margin: 0,
  });

  return (
    <p className={`${textStyle} ${className || ""}`} style={style} {...props}>
      {children}
    </p>
  );
};

export default FLPText;
