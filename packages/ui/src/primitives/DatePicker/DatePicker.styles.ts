import { cva, sva } from "../../../styled-system/css";

export const datePickerTriggerRecipe = sva({
  slots: ["root", "text", "icon"],
  base: {
    root: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "2",
      width: "100%",
      minWidth: 0,
      minHeight: "density.control.lg",
      "@media (pointer: coarse)": { minHeight: "touch" },
      px: "density.controlPadX",
      py: "density.controlPadY",
      backgroundColor: "surface.subtle",
      borderWidth: "1.5px",
      borderStyle: "solid",
      borderColor: "border.input",
      borderRadius: "lg",
      color: "text.primary",
      textStyle: "body.md",
      fontVariantNumeric: "tabular-nums",
      textAlign: "left",
      cursor: "pointer",
      _motionSafe: {
        transitionProperty: "border-color, background-color, box-shadow",
        transitionDuration: "fast",
        transitionTimingFunction: "standard",
      },
      _hover: { borderColor: "border.strong" },
      _focusVisible: {
        backgroundColor: "surface.card",
        borderColor: "border.focusRing",
        outlineWidth: "2px",
        outlineStyle: "solid",
        outlineColor: "border.focusRing",
        outlineOffset: "2px",
      },
      "&[data-invalid=true]": {
        borderColor: "status.danger.solid",
      },
      "&[data-disabled=true]": {
        backgroundColor: "surface.sunken",
        color: "text.muted",
        cursor: "not-allowed",
      },
    },
    text: {
      flex: "1",
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      "&[data-placeholder=true]": {
        color: "text.muted",
      },
    },
    icon: {
      display: "inline-flex",
      alignItems: "center",
      flexShrink: 0,
      color: "text.secondary",
    },
  },
});

export const datePickerContentRecipe = cva({
  base: {
    zIndex: "popover",
    width: "296px",
    padding: "3",
    backgroundColor: "surface.overlay",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    borderRadius: "card",
    boxShadow: "overlay",
    color: "text.primary",
    _focus: { outline: "none" },
  },
});

export const datePickerHeaderRecipe = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1",
    marginBottom: "2",
  },
});

export const datePickerNavButtonRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1",
    minWidth: "8",
    height: "8",
    px: "2",
    borderRadius: "control",
    borderWidth: "0",
    backgroundColor: "transparent",
    color: "text.secondary",
    textStyle: "label.sm",
    fontWeight: "semibold",
    cursor: "pointer",
    _hover: { backgroundColor: "surface.subtle", color: "text.primary" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const datePickerTitleGroupRecipe = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "1",
  },
});

/** The weekday header row. */
export const datePickerWeekdaysRecipe = cva({ base: {} });

export const datePickerWeekdayRecipe = cva({
  base: {
    textAlign: "center",
    textStyle: "label.sm",
    color: "text.muted",
    py: "1",
    fontWeight: "normal",
  },
});

/** The day grid: a native table, seven equal columns. */
export const datePickerDaysGridRecipe = cva({
  base: { width: "100%", tableLayout: "fixed", borderCollapse: "collapse" },
});

/** One day cell; its padding is the gap between days. */
export const datePickerDayCellRecipe = cva({ base: { p: "0.5", textAlign: "center" } });

/** One week (role="row") of the date grid. */
export const datePickerWeekRowRecipe = cva({ base: {} });

/** Visually hidden live region that announces the visible month or year range. */
export const datePickerLiveRegionRecipe = cva({
  base: { srOnly: true },
});

export const datePickerDayRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "full",
    height: "9",
    borderRadius: "control",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    backgroundColor: "transparent",
    color: "text.primary",
    textStyle: "body.sm",
    fontVariantNumeric: "tabular-nums",
    cursor: "pointer",
    _hover: { backgroundColor: "surface.subtle" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
    _disabled: {
      color: "text.muted",
      opacity: 0.45,
      cursor: "not-allowed",
      _hover: { backgroundColor: "transparent" },
    },
  },
  variants: {
    outside: {
      true: { color: "text.muted" },
      false: {},
    },
    today: {
      true: { borderColor: "border.strong", fontWeight: "semibold" },
      false: {},
    },
    selected: {
      true: {
        backgroundColor: "primary.solid",
        color: "primary.foreground",
        borderColor: "primary.solid",
        fontWeight: "semibold",
        _hover: { backgroundColor: "primary.hover" },
      },
      false: {},
    },
  },
  defaultVariants: {
    outside: false,
    today: false,
    selected: false,
  },
});

export const datePickerPeriodGridRecipe = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1.5",
    py: "1",
  },
});

export const datePickerPeriodCellRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: "9",
    borderRadius: "control",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    backgroundColor: "transparent",
    color: "text.primary",
    textStyle: "label.sm",
    fontVariantNumeric: "tabular-nums",
    cursor: "pointer",
    _hover: { backgroundColor: "surface.subtle" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
  variants: {
    selected: {
      true: {
        backgroundColor: "primary.subtle",
        color: "primary",
        borderColor: "primary.border",
        fontWeight: "semibold",
      },
      false: {},
    },
  },
  defaultVariants: { selected: false },
});

export const datePickerFooterRecipe = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "2",
    paddingTop: "2",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
  },
});

/** Full weekday name for screen readers; the short name is what shows. */
export const datePickerVisuallyHiddenRecipe = cva({ base: { srOnly: true } });
