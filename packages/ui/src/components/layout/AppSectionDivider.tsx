import { css } from "@repo/ui/styled-system/css";
import type { FC, ReactNode } from "react";

export interface AppSectionDividerProps {
  label: string;
  badge?: string;
  action?: ReactNode;
}

export const AppSectionDivider: FC<AppSectionDividerProps> = ({ label, badge, action }) => {
  return (
    <div
      className={css({
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "4",
        py: "3",
        borderBottom: "1px solid",
        borderColor: "border",
        mt: "2",
        mb: "2",
      })}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <h3
          className={css({
            fontFamily: "var(--fonts-display, 'Plus Jakarta Sans', sans-serif)",
            fontSize: "sm",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "text.primary",
            margin: 0,
          })}
        >
          {label}
        </h3>
        {badge && (
          <span
            className={css({
              fontFamily: "var(--fonts-mono, monospace)",
              fontSize: "xs",
              fontWeight: "600",
              px: "2",
              py: "0.5",
              borderRadius: "full",
              backgroundColor: "rgba(99, 102, 241, 0.12)",
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
