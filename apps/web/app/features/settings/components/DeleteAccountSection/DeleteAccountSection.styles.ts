import { cva } from "@repo/ui/styled-system/css";

export const deleteList = cva({
  base: { paddingLeft: "5", listStyle: "disc", display: "flex", flexDirection: "column", gap: "1" },
});

export const deleteDialogBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "2" },
});
