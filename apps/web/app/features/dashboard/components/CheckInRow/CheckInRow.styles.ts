import { cva } from "@repo/ui/styled-system/css";

/** One quiet row: icon, one line, one button. Wraps the button under the line at 320px. */
export const row = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "12px",
    paddingX: "16px",
    paddingY: "10px",
    minWidth: 0,
    backgroundColor: "surface.card",
    borderRadius: "card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
  },
});

export const rowIcon = cva({
  base: { display: "inline-flex", color: "text.secondary", flexShrink: 0 },
});

export const rowText = cva({
  base: {
    flex: "1 1 200px",
    minWidth: 0,
    margin: 0,
    textStyle: "body.sm",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});
