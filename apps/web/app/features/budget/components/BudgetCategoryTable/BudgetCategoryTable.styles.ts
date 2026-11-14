import { cva } from "@repo/ui/styled-system/css";

export const tableRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "20px" },
});

export const tableHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "16px",
  },
});

export const headerIdentity = cva({
  base: { display: "flex", alignItems: "center", gap: "14px", minWidth: 0 },
});

export const headerIcon = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    borderRadius: "lg",
    backgroundColor: "primary.subtle",
    color: "primary",
    flexShrink: 0,
  },
});

export const headerTitle = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const headerMeta = cva({
  base: {
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "6px",
    textStyle: "body.sm",
    color: "text.muted",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const headerActions = cva({
  base: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
});

export const nameCell = cva({
  base: { display: "flex", flexDirection: "column", gap: "6px", minWidth: "180px" },
});

export const nameText = cva({
  base: { textStyle: "label.md", color: "text.primary", margin: 0 },
});

export const badgeRow = cva({
  base: { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" },
});

export const noteText = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const frequencyText = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
});

export const actionsCell = cva({
  base: { display: "flex", justifyContent: "flex-end", gap: "4px" },
});

export const drawerWrap = cva({
  base: { marginTop: "4px" },
});
