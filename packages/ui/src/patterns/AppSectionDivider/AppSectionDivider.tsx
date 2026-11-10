import type { FC, ReactNode } from "react";
import { css, cx } from "../../../styled-system/css";
import { sectionDividerContainer, sectionDividerLabel } from "./AppSectionDivider.styles";

export interface AppSectionDividerProps {
  label: string;
  badge?: string;
  action?: ReactNode;
  className?: string;
}

export const AppSectionDivider: FC<AppSectionDividerProps> = ({
  label,
  badge,
  action,
  className,
}) => {
  return (
    <div className={cx(sectionDividerContainer(), className)}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <h3 className={sectionDividerLabel()}>{label}</h3>
        {badge && (
          <span
            className={css({
              fontFamily: "mono",
              fontSize: "xs",
              fontWeight: "600",
              px: "8px",
              py: "2px",
              borderRadius: "full",
              backgroundColor: "primary.subtle",
              color: "primary",
            })}
          >
            {badge}
          </span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export default AppSectionDivider;
