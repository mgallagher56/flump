import { cva } from "@repo/ui/styled-system/css";

export const pillRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    height: "100%",
    padding: { base: "16px", md: "24px" },
    backgroundColor: "surface.card",
    borderRadius: "card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    boxShadow: "card",
  },
});

export const pillHeader = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  },
});

export const pillIdentity = cva({
  base: { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 },
});

export const pillIcon = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    borderRadius: "lg",
    backgroundColor: "primary.subtle",
    color: "primary",
    flexShrink: 0,
  },
});

export const pillTitle = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const pillSubtitle = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const usageRow = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "4px 12px",
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const usageStrong = cva({
  base: { color: "text.primary", fontWeight: "semibold" },
});

export const scopeBox = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "6px 12px",
    padding: "12px 16px",
    borderRadius: "lg",
    backgroundColor: "surface.sunken",
    textStyle: "body.sm",
    color: "text.secondary",
  },
});

export const psaRow = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "4px 12px",
    paddingTop: "12px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});
