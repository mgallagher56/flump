import { cva } from "@repo/ui/styled-system/css";

export const footerRow = cva({
  base: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "3" },
});

/** The sign-out form fills the drawer's width, so its button lines up with the rows above. */
export const signOutForm = cva({
  base: { display: "flex", width: "100%", margin: "0" },
});

export const signUpLink = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "2",
    minHeight: "44px",
    paddingX: "3",
    marginBottom: "3",
    borderRadius: "md",
    backgroundColor: "primary.solid",
    color: "primary.foreground",
    textStyle: "label.md",
    fontWeight: "semibold",
    textDecoration: "none",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
    "& span": { textStyle: "label.sm", fontWeight: "normal" },
  },
});
