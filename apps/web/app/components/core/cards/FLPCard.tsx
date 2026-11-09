import type { FC, HTMLAttributes } from "react";
import { useResponsive } from "~/context/ResponsiveContext";
import { FLPCardMobileStyles, FLPCardStyles } from "./FLPCardStyles";

export interface FLPCardProps extends HTMLAttributes<HTMLDivElement> {
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
  interactive?: boolean;
}

const FLPCard: FC<FLPCardProps> = ({
  children,
  className,
  isMobile: propIsMobile,
  variant = "desktop",
  interactive = false,
  ...props
}) => {
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);

  return (
    <div
      className={`${FLPCardStyles} ${isMobileVariant ? FLPCardMobileStyles : ""} ${className || ""}`.trim()}
      data-interactive={interactive ? "true" : undefined}
      data-variant={isMobileVariant ? "mobile" : "desktop"}
      {...props}
    >
      {children}
    </div>
  );
};

export default FLPCard;
