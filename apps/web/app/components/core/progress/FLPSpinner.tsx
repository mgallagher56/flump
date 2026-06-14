import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";

interface FLPSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  children?: React.ReactNode;
}

const FLPSpinner: FC<FLPSpinnerProps> = ({ size = "md", children }) => {
  const sizeMap = {
    xs: "12px",
    sm: "16px",
    md: "24px",
    lg: "32px",
    xl: "48px",
  };

  const spinnerStyle = css({
    display: "inline-block",
    width: sizeMap[size],
    height: sizeMap[size],
    border: "2px solid rgba(255, 255, 255, 0.2)",
    borderTopColor: "primary",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  });

  return (
    <div className={css({ display: "inline-flex", alignItems: "center", gap: "8px" })}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className={spinnerStyle} data-testid="flp-spinner" />
      {children}
    </div>
  );
};

export default FLPSpinner;
