import { cva } from "@repo/ui/styled-system/css";

export const pageRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "6",
    width: "100%",
    minWidth: 0,
    paddingBottom: { base: "6", md: "12" },
    fontVariantNumeric: "tabular-nums",
  },
});

export const headerActions = cva({
  base: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "3" },
});

export const numeric = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});

export const iconButton = cva({
  base: { gap: "2" },
});
