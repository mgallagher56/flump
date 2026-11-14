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
