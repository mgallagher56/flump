import { cva } from "../../../styled-system/css";

export const debtHelpLinkRoot = cva({
  base: {
    paddingY: "3",
    paddingX: "4",
    borderRadius: "lg",
    border: "1px solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.subtle",
  },
});

export const debtHelpLinkText = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

export const debtHelpLinkAnchor = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1",
    color: "primary",
    textDecoration: "underline",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const debtHelpLinkSrOnly = cva({ base: { srOnly: true } });
