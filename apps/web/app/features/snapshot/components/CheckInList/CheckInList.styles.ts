import { cva } from "@repo/ui/styled-system/css";

export const listRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const rowList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
  },
});

export const listItem = cva({
  base: {
    py: "12px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    _last: { borderBottomWidth: 0 },
  },
});

export const listFooter = cva({
  base: { display: "flex", justifyContent: "flex-start" },
});
