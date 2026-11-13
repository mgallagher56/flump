import { cva } from "@repo/ui/styled-system/css";

export const listRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const listHeader = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  },
});

export const listTitle = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const listDescription = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: "4px 0 0" },
});

export const connectionList = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px", margin: 0, padding: 0 },
});

export const connectionRow = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column", sm: "row" },
    alignItems: { base: "stretch", sm: "center" },
    justifyContent: "space-between",
    gap: "12px",
    listStyle: "none",
  },
});

export const connectionInfo = cva({
  base: { display: "flex", alignItems: "center", gap: "16px", minWidth: 0 },
});

export const connectionAvatar = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    borderRadius: "full",
    backgroundColor: "primary.subtle",
    color: "primary",
    textStyle: "label.lg",
    flexShrink: 0,
  },
});

export const connectionText = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    alignItems: "flex-start",
    minWidth: 0,
  },
});

export const connectionName = cva({
  base: { textStyle: "label.lg", color: "text.primary", margin: 0 },
});

export const connectionMeta = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const connectionActions = cva({
  base: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    justifyContent: { base: "flex-end", sm: "flex-start" },
  },
});

export const spinning = cva({
  base: { display: "inline-flex", _motionSafe: { animation: "spin 1s linear infinite" } },
});

export const listItem = cva({
  base: { listStyle: "none" },
});
