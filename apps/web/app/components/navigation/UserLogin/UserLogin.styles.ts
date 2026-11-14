import { cva } from "@repo/ui/styled-system/css";

export const userLoginGroup = cva({
  base: { display: "flex", flexDirection: "row", alignItems: "center", gap: "2" },
});

/** Tighter than the default small button so both links fit beside the logo at 375. */
export const userLoginButton = cva({
  base: {
    px: { base: "2.5", sm: "4" },
    whiteSpace: "nowrap",
  },
});

/**
 * "Sign up" from `sm` up only: on a phone the top bar holds the menu button, logo, theme switch and
 * "Sign in", and the drawer the menu button opens offers "Sign up".
 */
export const userLoginSignUp = cva({
  base: {
    display: { base: "none", sm: "inline-flex" },
    px: { base: "2.5", sm: "4" },
    whiteSpace: "nowrap",
  },
});
