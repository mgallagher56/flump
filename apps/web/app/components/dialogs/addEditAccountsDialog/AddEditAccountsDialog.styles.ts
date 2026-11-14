import { cva } from "@repo/ui/styled-system/css";

export const fieldStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const saveError = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    margin: 0,
    paddingX: "12px",
    paddingY: "8px",
    textStyle: "body.sm",
    color: "status.danger.text",
    backgroundColor: "status.danger.bg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.danger.border",
    borderRadius: "md",
  },
});

/**
 * Cancel and Save. On a phone they stack full width with Save on top (the dialog footer stacks
 * its own children the same way); from `sm` they sit side by side on the right, Save last.
 */
export const dialogFooterGroup = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column-reverse", sm: "row" },
    gap: "8px",
    minWidth: 0,
    marginLeft: { base: 0, sm: "auto" },
    "& > *": { width: { base: "100%", sm: "auto" } },
  },
});

/**
 * Delete as a quiet destructive action: a ghost button in the danger text colour, left of Cancel
 * and Save from `sm`, below them on a phone. It opens the confirmation; it never deletes itself.
 * The attribute selector outranks the ghost variant's own text colour.
 */
export const deleteAction = cva({
  base: {
    "&[data-variant=ghost]": {
      color: "status.danger.text",
      _hover: { bg: "status.danger.bg" },
    },
  },
});
