import { cva } from "@repo/ui/styled-system/css";

export const widgetCard = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    boxShadow: "card",
    p: { base: "16px", md: "20px" },
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minWidth: 0,
    height: "100%",
  },
});

export const widgetHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    paddingBottom: "12px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
  },
});

export const widgetTitleRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
    color: "text.secondary",
  },
});

export const widgetTitle = cva({
  base: {
    textStyle: "heading.sm",
    color: "text.primary",
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

export const widgetActions = cva({
  base: { display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 },
});

export const widgetBody = cva({
  base: { flex: 1, minWidth: 0 },
});
