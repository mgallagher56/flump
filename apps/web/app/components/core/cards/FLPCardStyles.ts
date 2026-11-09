import { css } from "@repo/ui/styled-system/css";

export const FLPCardStyles = css({
  position: "relative",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  backgroundColor: "surface",
  color: "text.primary",
  boxShadow: "card",
  padding: { base: "4", md: "6" }, // 16px mobile, 24px desktop
  display: "flex",
  flexDirection: "column",
  "&[data-interactive='true']:hover": {
    borderColor: "primary",
    boxShadow: "cardHover",
  },
});

export const FLPCardMobileStyles = css({
  padding: "4",
  borderRadius: "lg",
});
