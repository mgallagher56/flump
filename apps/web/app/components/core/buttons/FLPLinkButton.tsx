import { buttonVariants } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import type { FC, ReactNode } from "react";
import { NavLink as RouterNavLink } from "react-router";

interface FLPLinkButtonProps {
  to: string;
  text: string;
  className?: string;
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
  icon?: ReactNode;
  onClick?: () => void;
}

const mobileLinkStyle = css({
  width: "100%",
  minHeight: "48px",
  justifyContent: "flex-start",
  padding: "12px 16px",
  borderRadius: "lg",
  fontSize: "15px",
  gap: "12px",
});

const FLPLinkButton: FC<FLPLinkButtonProps> = ({
  text,
  to,
  className,
  isMobile,
  variant = "desktop",
  icon,
  onClick,
}) => {
  const isMobileVariant = isMobile || variant === "mobile";

  return (
    <RouterNavLink
      className={({ isActive }) =>
        `${buttonVariants({ variant: isActive ? "secondary" : "ghost" })} ${
          isMobileVariant ? mobileLinkStyle : ""
        } ${className || ""}`.trim()
      }
      to={to}
      end={to === "/app/accounts" || to === "/"}
      onClick={onClick}
    >
      {icon && <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>}
      {text}
    </RouterNavLink>
  );
};

export default FLPLinkButton;
