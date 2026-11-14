import { cva } from "@repo/ui/styled-system/css";

export const row = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "4",
    py: "3",
    minWidth: 0,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    _last: { borderBottomWidth: 0 },
  },
});

/** The name column takes priority: it grows and shrinks, the total keeps its width. */
export const identity = cva({
  base: { display: "flex", alignItems: "center", gap: "3", minWidth: 0, flex: 1 },
});

export const details = cva({
  base: { display: "block", minWidth: 0, flex: 1 },
});

export const name = cva({
  base: { display: "block", textStyle: "body.md", fontWeight: "semibold", color: "text.primary" },
});

export const meta = cva({
  base: {
    display: "block",
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const total = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    flexShrink: 0,
    textAlign: "right",
  },
});

export const amount = cva({
  base: { color: "text.primary", fontVariantNumeric: "tabular-nums" },
});

export const amountCaption = cva({
  base: { textStyle: "body.sm", color: "text.secondary" },
});
