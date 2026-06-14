import { buttonVariants } from "@repo/ui";
import type { FC } from "react";
import { Link as RouterLink } from "react-router";

interface FLPLinkButtonProps {
  to: string;
  text: string;
  className?: string;
}

const FLPLinkButton: FC<FLPLinkButtonProps> = ({ text, to, className }) => {
  return (
    <RouterLink
      className={`${buttonVariants({ variant: "link" })} ${className || ""}`.trim()}
      to={to}
    >
      {text}
    </RouterLink>
  );
};

export default FLPLinkButton;
