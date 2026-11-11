import { cva } from "../../../styled-system/css";

// Standard clip pattern: removed from layout and sight, kept in the accessibility tree.
export const visuallyHiddenRecipe = cva({
  base: {
    position: "absolute",
    width: "1px",
    height: "1px",
    margin: "-1px",
    padding: "0",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    borderWidth: "0",
  },
  variants: {
    focusable: {
      // Un-hides on focus (skip links). Semantic surface/border tokens only.
      true: {
        _focus: {
          position: "fixed",
          top: "8px",
          left: "8px",
          zIndex: "9999",
          width: "auto",
          height: "auto",
          margin: "0",
          padding: "8px 16px",
          overflow: "visible",
          clip: "auto",
          whiteSpace: "normal",
          backgroundColor: "surface.card",
          color: "text.primary",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "border.input",
          borderRadius: "md",
          fontWeight: "semibold",
          textDecoration: "none",
        },
      },
      false: {},
    },
  },
  defaultVariants: {
    focusable: false,
  },
});
