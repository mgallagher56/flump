import type { FC, HTMLAttributes } from "react";
import { useResponsive } from "~/context/ResponsiveContext";
import { FLPCardMobileStyles, FLPCardStyles } from "./FLPCardStyles";

export interface FLPCardProps extends HTMLAttributes<HTMLDivElement> {
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

const FLPCard: FC<FLPCardProps> = ({
  children,
  className,
  isMobile: propIsMobile,
  variant = "desktop",
  ...props
}) => {
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);

  return (
    <div
      className={`${FLPCardStyles} ${isMobileVariant ? FLPCardMobileStyles : ""} ${className || ""}`.trim()}
      data-variant={isMobileVariant ? "mobile" : "desktop"}
      {...props}
    >
      {children}
    </div>
  );
};

export default FLPCard;
