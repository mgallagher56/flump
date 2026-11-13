import { cva } from "@repo/ui/styled-system/css";

export const overviewRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: { base: "24px", md: "32px" } },
});

export const section = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const sectionHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "8px",
  },
});

export const sectionTitle = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const heroSubtext = cva({
  base: {
    display: "inline-flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "6px",
  },
});

export const splitGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" },
    gap: "16px",
  },
});

export const splitCard = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px" },
});

export const splitTitle = cva({
  base: { textStyle: "label.md", color: "text.secondary", margin: 0 },
});

export const splitNote = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const noticeCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: { base: "16px", md: "20px" },
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.danger.border",
    backgroundColor: "status.danger.bg",
    color: "text.primary",
  },
});

export const noticeHeader = cva({
  base: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
});

export const noticeTitle = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const noticeBody = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

export const helplineList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 16px",
    textStyle: "body.sm",
  },
});

export const helplineLink = cva({
  base: {
    color: "primary",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const renewalList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
});

export const renewalRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "8px",
    textStyle: "body.sm",
    color: "text.primary",
  },
});

export const renewalName = cva({
  base: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
});

export const mutedText = cva({
  base: { color: "text.muted", fontVariantNumeric: "tabular-nums" },
});

export const dangerIcon = cva({
  base: { display: "inline-flex", color: "status.danger.text" },
});

export const warningIcon = cva({
  base: { display: "inline-flex", color: "status.warning.text" },
});
