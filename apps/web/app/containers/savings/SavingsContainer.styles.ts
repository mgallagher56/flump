import { cva } from "@repo/ui/styled-system/css";

export const pageRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    paddingBottom: "48px",
    minWidth: 0,
  },
});

export const tabPanel = cva({
  base: { display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 },
});

export const tabsRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 },
});
