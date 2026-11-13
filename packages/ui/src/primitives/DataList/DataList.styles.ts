import { cva } from "../../../styled-system/css";

export const dataListRecipe = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
  },
});

export const dataListRow = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    paddingBlock: "14px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    "&:last-child": { borderBottomWidth: "0" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const dataListText = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: "1 1 auto" },
});

export const dataListLabel = cva({
  base: { color: "text.primary", fontWeight: "medium", fontSize: "md", overflowWrap: "anywhere" },
});

export const dataListSecondary = cva({
  base: { color: "text.muted", fontSize: "sm", overflowWrap: "anywhere" },
});

export const dataListValue = cva({
  base: {
    flex: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "2px",
    textAlign: "end",
    fontVariantNumeric: "tabular-nums",
  },
});

export const dataListFooter = cva({
  base: { display: "flex", paddingBlockStart: "12px" },
});

export const dataListCount = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
