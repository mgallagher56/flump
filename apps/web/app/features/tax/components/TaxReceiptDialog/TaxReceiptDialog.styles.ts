import { cva } from "@repo/ui/styled-system/css";

export const body = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    marginTop: "4",
    fontVariantNumeric: "tabular-nums",
  },
});

/** One frame for every receipt, so a small image or a PDF never leaves the dialog looking empty. */
export const preview = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: "40",
    maxHeight: "96",
    p: "4",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.sunken",
    overflow: "hidden",
  },
});

export const image = cva({
  base: {
    display: "block",
    maxWidth: "100%",
    maxHeight: "80",
    minWidth: "24",
    minHeight: "24",
    objectFit: "contain",
    borderRadius: "md",
  },
});

export const tile = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2",
    textStyle: "body.sm",
    color: "text.secondary",
    textAlign: "center",
  },
});

export const fileRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "3",
    minWidth: 0,
  },
});

export const fileName = cva({
  base: { textStyle: "label.md", color: "text.primary", wordBreak: "break-all", minWidth: 0 },
});

export const empty = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const footer = cva({
  base: { display: "flex", justifyContent: "flex-end", width: "100%" },
});
