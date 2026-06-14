import { Button } from "@repo/ui";
import type { ButtonHTMLAttributes, FC } from "react";

interface FLPButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "link" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  disabled?: boolean;
  colorPalette?: string;
  padding?: number | string;
}

const FLPButton: FC<FLPButtonProps> = ({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  colorPalette,
  padding,
  children,
  ...props
}) => {
  // Map "ghost" and "outline" and "solid" variants to @repo/ui Button variants
  const mappedVariant =
    variant === "ghost"
      ? "ghost"
      : variant === "outline"
        ? "outline"
        : variant === "link"
          ? "link"
          : "primary";

  return (
    <Button
      disabled={disabled || loading}
      size={size as any}
      style={{ padding }}
      variant={mappedVariant as any}
      {...props}
    >
      {children}
    </Button>
  );
};

export default FLPButton;
