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
    alignItems: "start",
    gap: "12px",
    "& [data-field-label-row]": {
      sm: {
        minHeight: "2.5rem",
        display: "flex",
        alignItems: "flex-end",
      },
    },
  },
});

/**
 * Edit mode's "Delete debt": a quiet outline button with subtle danger tokens, set apart from
 * Save. The dialog footer stacks its buttons below `sm` (this one last) and puts it on the left
 * from `sm`.
 */
export const deleteAction = css({
  sm: { marginInlineEnd: "auto" },
  color: "status.danger.text",
  borderColor: "status.danger.border",
  _hover: {
    bg: "status.danger.bg",
    borderColor: "status.danger.border",
  },
});

/** Footer buttons keep their label on one line; the footer stacks them below `sm` instead. */
export const footerButton = css({ whiteSpace: "nowrap", flexShrink: 0 });
