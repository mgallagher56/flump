import { css, cva } from "@repo/ui/styled-system/css";

export const debtForm = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    fontVariantNumeric: "tabular-nums",
  },
});

export const fieldRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "12px",
  },
});

/**
 * Edit mode's "Delete debt": a quiet outline button set apart from Save. The dialog footer stacks
 * its buttons below `sm` (this one last) and puts it on the left from `sm`. It stays neutral (the
 * judgement guard keeps danger colours for the confirmation step, which is danger-toned).
 */
export const deleteAction = css({ sm: { marginInlineEnd: "auto" } });

/** Footer buttons keep their label on one line; the footer stacks them below `sm` instead. */
export const footerButton = css({ whiteSpace: "nowrap", flexShrink: 0 });
