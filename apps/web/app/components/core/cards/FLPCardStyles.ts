import { css } from "@repo/ui/styled-system/css";

export const FLPCardStyles = css({
  position: "relative",
  transition: "all 0.3s ease-in-out",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "lg",
  backgroundColor: "card",
  color: "card.foreground",
  boxShadow: "card",
  padding: "5",
  display: "flex",
  flexDirection: "column",
  "&:hover": {
    boxShadow: "cardHover",
    transform: "translate3d(-2px, -4px, 0)",
  },
});

export const FLPCardMobileStyles = css({
  padding: "3",
  borderRadius: "md",
  "&:hover": {
    transform: "none",
  },
});
