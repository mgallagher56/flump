import { cva } from "@repo/ui/styled-system/css";

export const list = cva({
  base: { listStyle: "none", margin: 0, padding: 0 },
});

export const btlSourceRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "4",
    paddingBlock: "3",
    borderBottom: "1px solid",
    borderBottomColor: "border.subtle",
  },
});

export const btlIdentity = cva({
  base: { display: "flex", alignItems: "center", gap: "3", minWidth: 0 },
});

export const btlDetails = cva({
  base: { display: "flex", flexDirection: "column", gap: "0.5", minWidth: 0 },
});

export const btlName = cva({
  base: { color: "text.primary", textStyle: "label.md" },
});

export const btlMeta = cva({
  base: { color: "text.secondary", textStyle: "body.sm" },
});
