import { cva } from "@repo/ui/styled-system/css";

export const workspaceStack = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "6",
    fontVariantNumeric: "tabular-nums",
  },
});

export const sectionCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    p: "5",
    borderRadius: "xl",
    bg: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const sectionHeaderRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "3",
  },
});

export const sectionTitle = cva({
  base: {
    fontSize: "lg",
    fontWeight: "semibold",
    color: "text.primary",
  },
});

export const sectionSubtitle = cva({
  base: {
    fontSize: "sm",
    color: "text.secondary",
  },
});

export const formGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(3, minmax(0, 1fr))" },
    gap: "4",
  },
});

export const fieldGroup = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5",
  },
});

export const fieldLabel = cva({
  base: {
    fontSize: "sm",
    fontWeight: "medium",
    color: "text.secondary",
  },
});

export const fieldHelper = cva({
  base: {
    fontSize: "xs",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const textInputStyle = cva({
  base: {
    width: "full",
    px: "3",
    py: "2",
    borderRadius: "md",
    bg: "surface.canvas",
    color: "text.primary",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    fontSize: "sm",
    fontVariantNumeric: "tabular-nums",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "1px",
    },
  },
});

export const actionRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "3",
  },
});

export const buttonGroup = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "2",
  },
});

export const primaryButton = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "2",
    px: "4",
    py: "2",
    borderRadius: "md",
    bg: "primary.solid",
    color: "primary.foreground",
    fontSize: "sm",
    fontWeight: "semibold",
    cursor: "pointer",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "primary.border",
    _hover: {
      bg: "primary.hover",
    },
    _disabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const secondaryButton = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "2",
    px: "3",
    py: "1.5",
    borderRadius: "md",
    bg: "surface.subtle",
    color: "text.primary",
    fontSize: "sm",
    fontWeight: "medium",
    cursor: "pointer",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    _hover: {
      bg: "surface.sunken",
    },
    _disabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const filterBar = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "3",
    p: "3",
    borderRadius: "lg",
    bg: "surface.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const dataTableWrapper = cva({
  base: {
    width: "full",
    overflowX: "auto",
  },
});

export const dataTable = cva({
  base: {
    width: "full",
    borderCollapse: "collapse",
    fontSize: "sm",
    fontVariantNumeric: "tabular-nums",
  },
});

export const tableHeaderCell = cva({
  base: {
    py: "2.5",
    px: "3",
    textAlign: "left",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderColor: "border.strong",
    color: "text.secondary",
    fontWeight: "semibold",
    fontSize: "xs",
    fontVariantNumeric: "tabular-nums",
  },
});

export const tableCell = cva({
  base: {
    py: "2.5",
    px: "3",
    textAlign: "left",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderColor: "border.subtle",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const numericValue = cva({
  base: {
    fontWeight: "semibold",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const statusPill = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    px: "2.5",
    py: "0.5",
    borderRadius: "full",
    fontSize: "xs",
    fontWeight: "semibold",
    borderWidth: "1px",
    borderStyle: "solid",
    fontVariantNumeric: "tabular-nums",
  },
  variants: {
    tone: {
      draft: {
        bg: "status.neutral.bg",
        color: "status.neutral.text",
        borderColor: "status.neutral.border",
      },
      issued: {
        bg: "status.info.bg",
        color: "status.info.text",
        borderColor: "status.info.border",
      },
      paid: {
        bg: "status.positive.bg",
        color: "status.positive.text",
        borderColor: "status.positive.border",
      },
      void: {
        bg: "surface.sunken",
        color: "text.muted",
        borderColor: "border.subtle",
      },
    },
  },
  defaultVariants: {
    tone: "draft",
  },
});

export const invoiceCardList = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
  },
});

export const invoiceCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    p: "4",
    borderRadius: "lg",
    bg: "surface.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    fontVariantNumeric: "tabular-nums",
  },
});

export const totalsGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(4, minmax(0, 1fr))" },
    gap: "3",
    p: "3",
    borderRadius: "md",
    bg: "surface.canvas",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    fontVariantNumeric: "tabular-nums",
  },
});

export const emptyBox = cva({
  base: {
    p: "6",
    textAlign: "center",
    borderRadius: "lg",
    bg: "surface.subtle",
    color: "text.secondary",
    fontSize: "sm",
  },
});

export const printHide = cva({
  base: {
    "@media print": {
      display: "none",
    },
  },
});

export const printSheet = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "5",
    p: "6",
    borderRadius: "xl",
    bg: "surface.canvas",
    color: "text.primary",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.strong",
    fontVariantNumeric: "tabular-nums",
    "@media print": {
      borderWidth: "0",
      p: "0",
    },
  },
});

export const printColumns = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "4",
  },
});

export const printTotalsBox = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    alignSelf: "flex-end",
    minWidth: "64",
    p: "4",
    borderRadius: "md",
    bg: "surface.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    fontVariantNumeric: "tabular-nums",
  },
});

export const printTotalRow = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    gap: "4",
    fontSize: "sm",
    color: "text.primary",
  },
});
