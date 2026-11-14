import { cva } from "@repo/ui/styled-system/css";

export const cardBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 },
});

export const drawerBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const takeHomeRow = cva({
  base: { "& th, & td": { fontWeight: "bold", color: "text.primary" } },
});
