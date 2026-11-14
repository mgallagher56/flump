import { cva } from "@repo/ui/styled-system/css";

export const detailsRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 },
});
