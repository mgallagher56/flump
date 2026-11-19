import { cva } from "@repo/ui/styled-system/css";

export const trigger = cva({
  // Never wider than its card: at 320px the label wraps instead of running off the screen (P48).
  base: { gap: "2", maxWidth: "100%", whiteSpace: "normal", "& svg": { flexShrink: 0 } },
});
