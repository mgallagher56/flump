import type { FC, HTMLAttributes } from "react";
import { FLPCardStyles } from "./FLPCardStyles";

interface FLPCardProps extends HTMLAttributes<HTMLDivElement> {}

const FLPCard: FC<FLPCardProps> = ({ children, className, ...props }) => {
  return (
    <div className={`${FLPCardStyles} ${className || ""}`} {...props}>
      {children}
    </div>
  );
};

export default FLPCard;
