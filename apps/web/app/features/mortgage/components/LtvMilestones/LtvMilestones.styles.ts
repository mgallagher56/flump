import { cva } from "@repo/ui/styled-system/css";

export const ltvCard = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    p: { base: "16px", md: "20px" },
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
  },
});

export const ltvHeader = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
});

export const ltvEyebrow = cva({
  base: { textStyle: "label.sm", color: "text.muted", margin: 0 },
});

export const ltvHeading = cva({
  base: {
    textStyle: "heading.sm",
    color: "text.primary",
    margin: 0,
    marginTop: "2px",
    fontVariantNumeric: "tabular-nums",
  },
});

export const tierGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
    gap: "12px",
  },
});

export const tierCard = cva({
  base: {
    p: "14px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
  variants: {
    achieved: {
      true: { backgroundColor: "status.positive.bg", borderColor: "status.positive.border" },
      false: { backgroundColor: "status.warning.bg", borderColor: "status.warning.border" },
    },
  },
});

export const tierTop = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
});

export const tierTitle = cva({
  base: { textStyle: "label.md", color: "text.primary" },
});

export const tierBody = cva({
  base: { textStyle: "body.sm", color: "text.secondary", fontVariantNumeric: "tabular-nums" },
});
