import { css } from "@repo/ui/styled-system/css";

export const FLPCardStyles = css({
  position: "relative",
  transition: "all 0.3s ease-in-out",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "lg",
  backgroundColor: "card",
  color: "card.foreground",
  padding: "5",
  display: "flex",
  flexDirection: "column",
  "&:hover": {
    boxShadow: "0 10px 20px rgba(0, 0, 0, 0.15) !important",
    transform: "translate3d(-2px, -4px, 0)",
  },
});
