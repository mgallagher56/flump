import { cva } from "../../../styled-system/css";

/**
 * The bar is narrower than 17rem: a phone at large text (375px at 200% text is about 11.7rem; a
 * 320px phone at default text is 20rem). A container query on the bar in rem, so it follows the
 * root font size (browser text zoom), which an em media query never sees (phone sweep 4). Not a
 * nav breakpoint: the nav still switches only on the shared nav conditions.
 */
const CRAMPED_BAR = "@container top-bar (max-width: 17rem)";

export const topBarRoot = cva({
  base: {
    position: "sticky",
    top: "0",
    zIndex: "header",
    width: "100%",
    backgroundColor: "color-mix(in srgb, token(colors.surface.canvas) 88%, transparent)",
    backdropFilter: "blur(14px)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    // Clear the notch and the rounded corners on a phone held sideways (phone audit P15). With
    // `viewport-fit=cover` these are zero wherever the screen has no cut-outs.
    paddingTop: "env(safe-area-inset-top)",
    // The side insets, or a hair that follows the root font size (0 at default text, 1px at
    // 200%): Chrome re-checks a container query only when the container's size changes, so a
    // text-size change after load then re-checks CRAMPED_BAR.
    paddingLeft: "max(env(safe-area-inset-left), calc(0.0625rem - 1px))",
    paddingRight: "max(env(safe-area-inset-right), calc(0.0625rem - 1px))",
    containerType: "inline-size",
    containerName: "top-bar",
  },
});

/**
 * For a lower-priority action (a sign-in or sign-up button) that the menu also offers: it leaves
 * the bar when the bar is cramped, so a phone at large text shows only the logo, the theme button
 * and the menu button.
 */
export const topBarOptionalAction = cva({
  base: { [CRAMPED_BAR]: { display: "none" } },
});

export const topBarInner = cva({
  base: {
    display: "flex",
    alignItems: "center",
    // Tablets (navInline up to navWide) get the compact desktop bar so it fits at 768px.
    gap: { base: "3", _navWide: "5" },
    // Below the nav breakpoint the 44px menu button sets the height. The floor is the px touch
    // size, not a rem step, so at large text the bar does not grow past its content (P19).
    minHeight: { base: "touch", _navInline: "18" },
    px: { base: "4", _navInline: "6", _navWide: "10" },
    py: "2",
    maxWidth: "1536px",
    marginX: "auto",
  },
});

export const topBarLogo = cva({
  base: { display: "inline-flex", alignItems: "center", flexShrink: 0 },
});

export const topBarMenuButton = cva({
  // A 44px touch target (sizes.touch), only below the nav breakpoint.
  base: { display: "inline-flex", minW: "touch", minH: "touch" },
  variants: {
    below: {
      inline: { _navInline: { display: "none" } },
      wide: { _navWide: { display: "none" } },
    },
  },
  defaultVariants: { below: "inline" },
});

export const topBarNav = cva({
  base: {
    display: { base: "none", _navInline: "block" },
    flex: "1",
    minWidth: 0,
    marginLeft: { base: "3", _navInline: "1", _navWide: "3" },
  },
  variants: {
    // Where the inline links start: `wide` keeps them in the menu on tablets too (P72).
    from: {
      inline: {},
      wide: { display: { base: "none", _navInline: "none", _navWide: "block" } },
    },
  },
  defaultVariants: { from: "inline" },
});

export const topBarList = cva({
  base: {
    display: "flex",
    alignItems: "center",
    // The links' own padding spaces them; a small gap keeps hover fills apart. The gap, not the
    // padding, is what gives way so every bar fits at 768px and 1024px with no label shortened.
    gap: "0.5",
    flexWrap: "nowrap",
    listStyle: "none",
    padding: "0",
    margin: "0",
  },
});

export const topBarNavItem = cva({
  base: { position: "relative", flexShrink: 0 },
  variants: {
    // Lower-priority links: in the menu on tablets, inline from navWide.
    wideOnly: { true: { display: "none", _navWide: { display: "list-item" } }, false: {} },
  },
  defaultVariants: { wideOnly: false },
});

export const topBarLink = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    minH: "8",
    // The same room each side at every width, so text never sits close to the fill's edge (owner
    // report). Bars that would not fit move links into the menu (`wideOnly`), not this padding.
    px: "3",
    borderRadius: "full",
    // Text-only links at every width, on both sites: icons pushed the web bar past 1024px and
    // added nothing the words do not say (the drawer and bottom bar keep their icons).
    "& > svg": { display: "none" },
    backgroundColor: "transparent",
    borderWidth: "0",
    color: "text.secondary",
    textStyle: "label.md",
    fontWeight: "semibold",
    whiteSpace: "nowrap",
    textDecoration: "none",
    cursor: "pointer",
    _motionSafe: {
      transitionProperty: "background-color, color",
      transitionDuration: "fast",
      transitionTimingFunction: "standard",
    },
    _hover: { backgroundColor: "surface.sunken", color: "text.primary" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
    '&[aria-current="page"]': { backgroundColor: "primary.subtle", color: "primary" },
  },
});

export const topBarBadge = cva({
  base: {
    textStyle: "label.sm",
    fontVariantNumeric: "tabular-nums",
    color: "text.secondary",
    backgroundColor: "surface.sunken",
    borderRadius: "full",
    px: "2",
  },
});

export const topBarFlyout = cva({
  base: {
    position: "absolute",
    top: "100%",
    left: "0",
    mt: "2",
    minWidth: "260px",
    zIndex: "dropdown",
    display: "flex",
    flexDirection: "column",
    gap: "1",
    padding: "2",
    backgroundColor: "surface.overlay",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    borderRadius: "card",
    boxShadow: "overlay",
  },
});

export const topBarFlyoutLink = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "3",
    padding: "2",
    px: "3",
    borderRadius: "control",
    color: "text.primary",
    textDecoration: "none",
    _hover: { backgroundColor: "surface.sunken" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
    '&[aria-current="page"]': { backgroundColor: "primary.subtle", color: "primary" },
  },
});

export const topBarFlyoutText = cva({
  base: { display: "flex", flexDirection: "column", gap: "0.5" },
});

export const topBarFlyoutLabel = cva({
  base: { textStyle: "label.md", fontWeight: "semibold" },
});

export const topBarFlyoutDescription = cva({
  base: { textStyle: "body.sm", color: "text.secondary" },
});

export const topBarActions = cva({
  base: { display: "flex", alignItems: "center", gap: "3", marginLeft: "auto", flexShrink: 0 },
});

export const topBarInlineActions = cva({
  base: { display: { base: "none", _navInline: "flex" }, alignItems: "center", gap: "3" },
});

/** The group button's chevron: says "opens a menu" at every width; turns when open. */
export const topBarChevron = cva({
  base: {
    display: "inline-flex",
    marginLeft: "-1",
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
