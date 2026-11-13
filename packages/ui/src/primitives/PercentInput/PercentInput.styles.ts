import { cva } from "../../../styled-system/css";

/** Applied to the bordered wrapper: figures line up while typing. */
export const percentInputRecipe = cva({
  base: {
    fontVariantNumeric: "tabular-nums",
  },
});
