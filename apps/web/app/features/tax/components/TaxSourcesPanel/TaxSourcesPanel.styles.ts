import { cva } from "@repo/ui/styled-system/css";

export const root = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const intro = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

/** The one-line context note at the top of each source card. */
export const note = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "3",
    px: "4",
    py: "3",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    textStyle: "body.sm",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
    "& strong": { fontWeight: "semibold" },
  },
  variants: {
    tone: {
      info: { backgroundColor: "status.info.bg", borderColor: "status.info.border" },
      neutral: { backgroundColor: "surface.subtle", borderColor: "border.subtle" },
    },
  },
  defaultVariants: { tone: "neutral" },
});
