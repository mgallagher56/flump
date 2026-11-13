import { cva } from "@repo/ui/styled-system/css";

export const resultsRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const perMonth = cva({
  base: { textStyle: "body.sm", color: "text.muted", fontWeight: "normal", marginLeft: "4px" },
});

export const benchmarkPanel = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "16px",
    backgroundColor: "surface.card",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    fontVariantNumeric: "tabular-nums",
  },
});

export const benchmarkScale = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "4px 12px",
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const estimateNote = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const allowanceNotice = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px 12px",
    padding: "12px 16px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.warning.border",
    backgroundColor: "status.warning.bg",
    color: "text.primary",
    textStyle: "body.sm",
    fontVariantNumeric: "tabular-nums",
    "& p": { margin: 0 },
  },
});
