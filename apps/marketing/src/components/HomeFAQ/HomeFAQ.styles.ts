import { cva } from "@repo/ui/styled-system/css";

export const faqList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "3",
  },
});

export const faqItem = cva({
  base: {
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    borderRadius: "lg",
    overflow: "hidden",
  },
});

export const faqQuestion = cva({
  base: {
    width: "100%",
    px: { base: "4", md: "5" },
    py: "4",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "4",
    backgroundColor: "transparent",
    border: "none",
    textAlign: "left",
    textStyle: "heading.sm",
    color: "text.primary",
    cursor: "pointer",
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
  },
});

export const faqChevron = cva({
  base: {
    display: "inline-flex",
    flexShrink: 0,
    color: "text.muted",
    _motionSafe: { transition: "transform token(durations.base) token(easings.standard)" },
  },
  variants: { open: { true: { transform: "rotate(180deg)" }, false: {} } },
  defaultVariants: { open: false },
});

export const faqAnswer = cva({
  base: { px: { base: "4", md: "5" }, pb: "4", textStyle: "body.md", color: "text.secondary" },
});

export const faqAnswerText = cva({
  base: { margin: 0 },
});

export const faqLink = cva({
  base: {
    color: "text.primary",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _hover: { color: "primary.hover" },
  },
});
