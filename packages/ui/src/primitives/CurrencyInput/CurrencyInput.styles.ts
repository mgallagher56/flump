import { cva } from "../../../styled-system/css";

/** Applied to the bordered wrapper: figures line up while typing. */
export const currencyInputRecipe = cva({
  base: {
    fontVariantNumeric: "tabular-nums",
  },
});
