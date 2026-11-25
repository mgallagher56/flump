import { cva } from "@repo/ui/styled-system/css";

export const shareStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "3", minWidth: 0 },
});
