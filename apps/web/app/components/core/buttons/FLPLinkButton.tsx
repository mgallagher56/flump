import { buttonVariants } from "@repo/ui";
import type { FC } from "react";
import { NavLink as RouterNavLink } from "react-router";

interface FLPLinkButtonProps {
  to: string;
  text: string;
  className?: string;
}

const FLPLinkButton: FC<FLPLinkButtonProps> = ({ text, to, className }) => {
  return (
    <RouterNavLink
      className={({ isActive }) =>
        `${buttonVariants({ variant: isActive ? "secondary" : "ghost" })} ${className || ""}`.trim()
      }
      to={to}
      end={to === "/app" || to === "/"}
    >
      {text}
    </RouterNavLink>
  );
};

export default FLPLinkButton;
