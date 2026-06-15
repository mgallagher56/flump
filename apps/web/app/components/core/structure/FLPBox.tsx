import { css } from "@repo/ui/styled-system/css";
import type { FC, HTMLAttributes } from "react";

interface FLPBoxProps extends HTMLAttributes<HTMLDivElement> {
  display?: string;
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  alignItems?: string;
  justifyContent?: string;
  gap?: number | string;
  my?: number | string;
  mb?: number | string;
  mt?: number | string;
  pb?: number | string;
  pt?: number | string;
  flexWrap?: "wrap" | "nowrap" | "wrap-reverse";
  borderBottom?: string;
  borderColor?: string;
}

const FLPBox: FC<FLPBoxProps> = ({
  display,
  flexDirection,
  alignItems,
  justifyContent,
  gap,
  my,
  mb,
  mt,
  pb,
  pt,
  flexWrap,
  borderBottom,
  borderColor,
  style,
  className,
  children,
  ...props
}) => {
  const boxStyle = css({
    display,
    flexDirection,
    alignItems,
    justifyContent,
    gap,
    marginTop: my || mt,
    marginBottom: my || mb,
    paddingBottom: pb,
    paddingTop: pt,
    flexWrap,
    borderBottom,
    borderColor,
  });

  return (
    <div className={`${boxStyle} ${className || ""}`} style={style} {...props}>
      {children}
    </div>
  );
};

export default FLPBox;
