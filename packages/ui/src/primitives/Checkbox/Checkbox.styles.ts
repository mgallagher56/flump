import { sva } from "../../../styled-system/css";

/** Box 22px centred in a 44px touch column; the real input overlays that column. */
export const checkboxRecipe = sva({
  slots: ["root", "control", "input", "box", "tick", "dash", "label", "hint"],
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      minWidth: 0,
    },
    control: {
      position: "relative",
      display: "flex",
      alignItems: "flex-start",
      minHeight: "touch",
      cursor: "pointer",
      "&[data-disabled=true]": { cursor: "not-allowed" },
    },
    input: {
      position: "absolute",
      left: 0,
      top: 0,
      width: "touch",
      height: "touch",
      margin: 0,
      opacity: 0,
      cursor: "inherit",
    },
    box: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      boxSizing: "border-box",
      width: "22px",
      height: "22px",
      my: "11px",
      mx: "11px",
      backgroundColor: "surface.subtle",
      borderWidth: "1.5px",
      borderStyle: "solid",
      borderColor: "border.input",
      borderRadius: "md",
      color: "primary.foreground",
      _motionSafe: {
        transitionProperty: "background-color, border-color",
        transitionDuration: "fast",
        transitionTimingFunction: "standard",
      },
      "label:hover input:enabled + &": { borderColor: "border.strong" },
      "input:checked + &, input:indeterminate + &": {
        backgroundColor: "primary.solid",
        borderColor: "primary.solid",
      },
      "input:focus-visible + &": {
        outlineWidth: "2px",
        outlineStyle: "solid",
        outlineColor: "border.focusRing",
        outlineOffset: "2px",
      },
      "input[aria-invalid=true] + &": { borderColor: "status.danger.solid" },
      "input:disabled + &": { backgroundColor: "surface.sunken", borderColor: "border.subtle" },
      "input:disabled:checked + &, input:disabled:indeterminate + &": {
        backgroundColor: "text.muted",
        borderColor: "text.muted",
      },
    },
    tick: {
      display: "none",
      "input:checked + * > &": { display: "inline-flex" },
      "input:indeterminate + * > &": { display: "none" },
    },
    dash: {
      display: "none",
      "input:indeterminate + * > &": { display: "inline-flex" },
    },
    label: {
      alignSelf: "center",
      py: "2",
      textStyle: "body.md",
      color: "text.primary",
      "[data-disabled=true] > &": { color: "text.muted" },
    },
    hint: {
      textStyle: "body.sm",
      color: "text.secondary",
      margin: 0,
      pl: "touch",
      mt: "-1.5",
      pb: "2",
    },
  },
});
