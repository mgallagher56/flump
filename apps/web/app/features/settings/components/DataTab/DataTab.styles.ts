import { cva } from "@repo/ui/styled-system/css";

export const dangerRow = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column", sm: "row" },
    alignItems: { base: "flex-start", sm: "center" },
    justifyContent: "space-between",
    gap: "4",
    paddingLeft: "4",
    borderLeftWidth: "4px",
    borderLeftStyle: "solid",
    borderLeftColor: "status.danger.border",
  },
});

export const dangerText = cva({
  base: { display: "flex", flexDirection: "column", gap: "1", minWidth: 0 },
});

export const dangerTitle = cva({
  base: { textStyle: "label.md", color: "status.danger.text", margin: 0 },
});

export const dangerCopy = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

export const wipeList = cva({
  base: { paddingLeft: "5", listStyle: "disc", display: "flex", flexDirection: "column", gap: "1" },
});

export const dialogBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "2" },
});
