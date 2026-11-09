import { Button } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import type { ButtonHTMLAttributes, FC } from "react";
import { useResponsive } from "~/context/ResponsiveContext";

export interface FLPButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "link" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  disabled?: boolean;
  padding?: number | string;
  isMobile?: boolean;
  fullWidthOnMobile?: boolean;
}

const mobileBtnStyle = (fullWidth?: boolean) =>
  css({
    minHeight: "44px",
    width: fullWidth ? "100%" : undefined,
  });

const FLPButton: FC<FLPButtonProps> = ({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  padding,
  isMobile: propIsMobile,
  fullWidthOnMobile,
  className,
  children,
  ...props
}) => {
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = propIsMobile ?? contextIsMobile;

  const mappedVariant =
    variant === "ghost"
      ? "ghost"
      : variant === "outline"
        ? "outline"
        : variant === "link"
          ? "link"
          : variant === "destructive"
            ? "destructive"
            : variant === "secondary"
              ? "secondary"
              : "primary";

  const combinedClassName = [
    isMobileVariant ? mobileBtnStyle(fullWidthOnMobile) : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <Button
      className={combinedClassName || undefined}
      disabled={disabled || loading}
      size={size}
      style={{ padding }}
      variant={mappedVariant}
      {...props}
    >
      {children}
    </Button>
  );
};

export default FLPButton;
