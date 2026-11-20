import { cva } from "@repo/ui/styled-system/css";

export const inviteListRoot = cva({
  base: { listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column" },
});

export const inviteListRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "3",
    paddingY: "3",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    _last: { borderBottomWidth: "0" },
  },
});

export const inviteListMain = cva({
  base: { display: "flex", flexDirection: "column", gap: "1", minWidth: "0" },
});

export const inviteListTitle = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2",
    color: "text.primary",
    fontWeight: "medium",
  },
});

export const inviteListMeta = cva({
  base: { textStyle: "body.sm", color: "text.secondary", fontVariantNumeric: "tabular-nums" },
});

export const inviteListEmpty = cva({
  base: { textStyle: "body.sm", color: "text.secondary" },
});
