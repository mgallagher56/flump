import { cva } from "@repo/ui/styled-system/css";

export const mobileMenuContainer = cva({
  base: { display: "flex", flexDirection: "column", gap: "1", width: "100%" },
});

export const mobileSection = cva({
  base: { display: "flex", flexDirection: "column", gap: "1" },
});

export const mobileSectionHeading = cva({
  base: {
    // Sentence case, no tracking (P7.3): a quiet group label, not an eyebrow.
    textStyle: "label.sm",
    color: "text.muted",
    padding: "10px 16px 4px",
    marginTop: "1",
  },
});

export const dropdownContainer = cva({
  base: { position: "relative", display: "inline-flex", alignItems: "center" },
});

export const triggerIconSlot = cva({
  base: { display: "inline-flex", alignItems: "center", marginRight: "1.5" },
});

export const triggerChevron = cva({
  base: {
    marginLeft: "1.5",
    opacity: 0.75,
    _motionSafe: {
      transitionProperty: "transform",
      transitionDuration: "fast",
      transitionTimingFunction: "standard",
    },
  },
  variants: { open: { true: { transform: "rotate(180deg)" }, false: {} } },
  defaultVariants: { open: false },
});

export const activeChildDot = cva({
  base: {
    width: "6px",
    height: "6px",
    borderRadius: "full",
    backgroundColor: "primary",
    marginLeft: "1.5",
    flexShrink: 0,
  },
});

export const flyoutPanel = cva({
  base: {
    position: "absolute",
    top: "calc(100% + 10px)",
    left: "0",
    minWidth: "290px",
    padding: "2",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.overlay",
    boxShadow: "overlay",
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    gap: "1",
  },
});

export const flyoutItem = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "3",
    padding: "10px 12px",
    borderRadius: "lg",
    textDecoration: "none",
    color: "text.primary",
    backgroundColor: "transparent",
    _motionSafe: {
      transitionProperty: "background-color",
      transitionDuration: "fast",
      transitionTimingFunction: "standard",
    },
    _hover: { backgroundColor: "surface.subtle" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
  },
  variants: { active: { true: { backgroundColor: "primary.subtle" }, false: {} } },
  defaultVariants: { active: false },
});

export const flyoutIconBox = cva({
  base: {
    width: "36px",
    height: "36px",
    borderRadius: "lg",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: "primary.subtle",
    color: "primary",
  },
});

export const flyoutText = cva({
  base: { display: "flex", flexDirection: "column", gap: "0.5" },
});

export const flyoutLabel = cva({
  base: { textStyle: "label.md", lineHeight: 1.25 },
});

export const flyoutDescription = cva({
  base: { textStyle: "body.sm", color: "text.muted", lineHeight: 1.35 },
});

/** Desktop row of links and dropdown triggers. */
export const desktopGroup = cva({
  base: { display: "flex", flexDirection: "row", alignItems: "center", gap: "2" },
});

/** Drawer link: full width, left aligned, 48px tall for touch. */
export const mobileLink = cva({
  base: {
    width: "100%",
    minHeight: "12",
    justifyContent: "flex-start",
    px: "4",
    py: "3",
    borderRadius: "lg",
    textStyle: "body.md",
    gap: "3",
  },
});

export const linkIcon = cva({
  base: { display: "inline-flex", alignItems: "center" },
});
