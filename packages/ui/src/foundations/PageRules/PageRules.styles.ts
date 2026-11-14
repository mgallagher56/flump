import { cva } from "../../../styled-system/css";

export const pageRulesRoot = cva({
  base: {
    p: { base: "page.gutter.sm", md: "page.gutter.md" },
    backgroundColor: "surface.canvas",
    color: "text.primary",
    minHeight: "100%",
  },
});

export const pageRulesTitle = cva({ base: { textStyle: "heading.lg", m: "0", mb: "1" } });

export const pageRulesIntro = cva({
  base: { textStyle: "body.md", color: "text.secondary", m: "0", mb: "6", maxWidth: "70ch" },
});

export const pageRulesList = cva({
  base: { listStyle: "none", m: "0", p: "0", display: "flex", flexDirection: "column", gap: "4" },
});

export const pageRulesCard = cva({
  base: {
    p: { base: "4", md: "5" },
    borderRadius: "card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    backgroundColor: "surface.card",
    boxShadow: "card",
    display: "flex",
    flexDirection: "column",
    gap: "3",
  },
});

export const pageRulesHeading = cva({ base: { textStyle: "heading.sm", m: "0" } });

export const pageRulesRule = cva({
  base: { textStyle: "body.md", color: "text.primary", m: "0", fontVariantNumeric: "tabular-nums" },
});

export const pageRulesExamples = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" },
    gap: "3",
  },
});

export const pageRulesExample = cva({
  base: {
    p: "3",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    display: "flex",
    gap: "2",
    alignItems: "flex-start",
    textStyle: "body.sm",
    fontVariantNumeric: "tabular-nums",
    color: "text.primary",
  },
  variants: {
    tone: {
      good: { backgroundColor: "status.positive.bg", borderColor: "status.positive.border" },
      bad: { backgroundColor: "surface.subtle", borderColor: "border" },
    },
  },
  defaultVariants: { tone: "good" },
});

export const pageRulesExampleLabel = cva({
  base: { display: "block", textStyle: "label.sm", fontWeight: "semibold", mb: "0.5" },
  variants: {
    tone: {
      good: { color: "status.positive.text" },
      bad: { color: "text.secondary" },
    },
  },
  defaultVariants: { tone: "good" },
});

export const pageRulesExampleIcon = cva({
  base: { flexShrink: 0, mt: "0.5" },
  variants: {
    tone: {
      good: { color: "status.positive.text" },
      bad: { color: "text.secondary" },
    },
  },
  defaultVariants: { tone: "good" },
});

export const pageRulesExampleText = cva({ base: { m: "0" } });
