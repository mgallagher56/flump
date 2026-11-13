import { cva } from "@repo/ui/styled-system/css";

// Disabled is signalled by a lock icon and dashed outline, not by fading the text (contrast).
export const item = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2",
    width: "100%",
    minHeight: "44px",
    paddingX: "3",
    borderWidth: "1px",
    borderStyle: "dashed",
    borderColor: "border.strong",
    borderRadius: "md",
    background: "transparent",
    textAlign: "left",
    textStyle: "label.md",
    color: "text.secondary",
    cursor: "not-allowed",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const hint = cva({
  base: {
    marginLeft: "auto",
    display: "inline-flex",
    alignItems: "center",
    gap: "1",
    textStyle: "label.sm",
    color: "text.secondary",
  },
});
