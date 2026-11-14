import { cva } from "../../../styled-system/css";

/**
 * E16 P9.3: a 40px rounded tile on the domain's tint behind a Lucide icon. The icon uses
 * `text.primary`, which clears 4.5:1 on every tint and on `surface.subtle` in both themes.
 * The neutral tile sits on `surface.subtle` with a `border` edge: `surface.sunken` was darker than
 * the dark card and read as a hole, so the tile all but vanished in dark mode.
 */
export const iconTile = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: "0",
    width: "40px",
    height: "40px",
    borderRadius: "lg",
    color: "text.primary",
  },
  variants: {
    tone: {
      teal: { backgroundColor: "surface.tint.teal" },
      sage: { backgroundColor: "surface.tint.sage" },
      apricot: { backgroundColor: "surface.tint.apricot" },
      neutral: {
        backgroundColor: "surface.subtle",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "border",
      },
    },
  },
  defaultVariants: { tone: "neutral" },
});
