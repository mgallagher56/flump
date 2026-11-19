import { cva } from "@repo/ui/styled-system/css";

export const fieldStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

/** Two short fields side by side (years and months), stacked on a phone. */
export const fieldPair = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
    gap: "4",
    minWidth: 0,
  },
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

/** The delete question's consequence, in the Edit dialog's body while it asks. */
export const deleteConsequence = cva({
  base: { margin: 0, textStyle: "body.md", color: "text.secondary" },
});

/** Neutral UK joint-debt liability notice shown when a mortgage or debt is marked joint. */
export const jointNotice = cva({
  base: {
    margin: 0,
    paddingX: "12px",
    paddingY: "8px",
    textStyle: "body.sm",
    color: "text.secondary",
    backgroundColor: "surface.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "md",
  },
});
