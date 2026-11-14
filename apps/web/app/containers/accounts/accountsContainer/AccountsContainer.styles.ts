import { cva } from "@repo/ui/styled-system/css";

export const headerActions = cva({
  base: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px" },
});

export const emptyWrap = cva({
  base: { display: "flex", justifyContent: "center", minWidth: 0 },
});
