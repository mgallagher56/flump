import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";

interface FLPSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Visible label rendered beside the spinner. */
  children?: React.ReactNode;
  /** Accessible name announced for the spinner when it is not decorative. Defaults to "Loading". */
  label?: string;
  /**
   * Hide the spinner from assistive tech (no role, no name). Defaults to true when `children`
   * (a visible label) is present, so the state is not announced twice, and to false otherwise.
   * Set it explicitly when the spinner sits inside a button or live region that already says
   * "Loading".
   */
  decorative?: boolean;
}

const FLPSpinner: FC<FLPSpinnerProps> = ({
  size = "md",
  children,
  label = "Loading",
  decorative,
}) => {
  const isDecorative = decorative ?? children != null;
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
      <div
        className={spinnerStyle}
        data-spinner
        data-testid="flp-spinner"
        {...(isDecorative ? { "aria-hidden": true } : { role: "status", "aria-label": label })}
      />
      {children}
    </div>
  );
};

export default FLPSpinner;
