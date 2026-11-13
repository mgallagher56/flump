import { cva } from "@repo/ui/styled-system/css";

export const checkInIntro = cva({
  base: { margin: 0, textStyle: "body.sm", color: "text.secondary" },
});

export const monthPicker = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr 1fr", sm: "2fr 1fr" },
    gap: "12px",
    paddingBottom: "16px",
    marginBottom: "4px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
  },
});

export const accountList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
  },
});

export const accountRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "minmax(0, 1fr) 13rem" },
    alignItems: { base: "stretch", sm: "center" },
    gap: { base: "8px", sm: "16px" },
    py: "12px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    _last: { borderBottomWidth: 0 },
  },
});

export const accountName = cva({
  base: { margin: 0, textStyle: "label.md", color: "text.primary" },
});

export const accountStatus = cva({
  base: {
    margin: 0,
    marginTop: "2px",
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const connectedValue = cva({
  base: {
    margin: 0,
    textStyle: "numeric.md",
    color: "text.primary",
    textAlign: { base: "start", sm: "end" },
    fontVariantNumeric: "tabular-nums",
  },
});

export const summaryLine = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const footerRow = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column-reverse", sm: "row" },
    justifyContent: "flex-end",
    gap: "8px",
    width: "100%",
  },
});
