import { cva } from "@repo/ui/styled-system/css";

export const accountRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "4",
  },
});

export const accountIdentity = cva({
  base: { display: "flex", alignItems: "center", gap: "3", minWidth: 0 },
});

export const accountIcon = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: "10",
    height: "10",
    borderRadius: "full",
    backgroundColor: "primary.subtle",
    color: "primary",
  },
});

export const accountLabel = cva({
  base: { textStyle: "label.sm", color: "text.muted", margin: 0 },
});

export const accountEmail = cva({
  base: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "2",
    textStyle: "label.md",
    color: "text.primary",
    overflowWrap: "anywhere",
  },
});
