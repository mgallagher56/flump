import { cva } from "@repo/ui/styled-system/css";

/** Ownership and share side by side, wrapping on a narrow row. */
export const ownershipField = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "2",
    fontVariantNumeric: "tabular-nums",
  },
});

/** The share input keeps a fixed width so "100 %" fits. */
export const shareField = cva({
  base: { width: "88px", flexShrink: 0 },
});

/** The quiet "Joint, 50%" label, as the accounts list shows it. */
export const shareLabel = cva({
  base: { textStyle: "body.sm", color: "text.muted", fontVariantNumeric: "tabular-nums" },
});
