import { css } from "@repo/ui/styled-system/css";
import type { FC, HTMLAttributes } from "react";

interface FLPButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  gap?: number | string;
  attached?: boolean;
}

const FLPButtonGroup: FC<FLPButtonGroupProps> = ({
  gap = "8px",
  attached,
  style,
  className,
  children,
  ...props
}) => {
  const groupStyle = css({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: attached ? "0" : gap,
    "& button": attached
      ? {
          borderRadius: "0",
          _first: { borderTopLeftRadius: "md", borderBottomLeftRadius: "md" },
          _last: { borderTopRightRadius: "md", borderBottomRightRadius: "md" },
        }
      : {},
  });

  return (
    <div className={`${groupStyle} ${className || ""}`} style={style} {...props}>
      {children}
    </div>
  );
};

export default FLPButtonGroup;
